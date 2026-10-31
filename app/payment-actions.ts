"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { accessFor, canWatch, userIdFromToken } from "@/lib/access";
import { metaBrowser, sendMetaEvent } from "@/lib/meta-capi";
import { MOVIE_ACCESS_DAYS } from "@/lib/movies";
import { getPayment, metaContentIdOf, settleQpay, type PaymentRow } from "@/lib/payments";
import { createInvoice, qpayConfigured } from "@/lib/qpay";
import { getAdminClient } from "@/lib/supabase";

export type CheckoutItem =
  | { kind: "subscription"; planId: string }
  | { kind: "movie"; movieId: string };

export type CheckoutView = {
  id: string;
  title: string;
  amount: number;
  qpay: NonNullable<PaymentRow["qpay"]>;
  /** The same id the server's copy of the ad event uses (see lib/meta-capi.ts). */
  metaContentId: string;
};

export type CheckoutResult =
  | { ok: true; checkout: CheckoutView }
  | { ok: false; error: string; needsLogin?: boolean };

const REUSE_MS = 24 * 60 * 60 * 1000;

/** QPay calls this address after payment. Same origin rule as emailed links. */
async function callbackUrl(id: string): Promise<string> {
  let base = process.env.SITE_URL?.replace(/\/$/, "");
  if (!base) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    base = `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  }
  return `${base}/api/payments/qpay?id=${encodeURIComponent(id)}`;
}

/** Price and title always come from the database, never from the browser. */
async function resolveItem(item: CheckoutItem) {
  const admin = getAdminClient()!;
  if (item.kind === "subscription") {
    const { data } = await admin
      .from("plans")
      .select("id, name, price, days")
      .eq("id", item.planId)
      .eq("active", true)
      .maybeSingle();
    return (
      data && {
        plan_id: data.id,
        days: data.days,
        movie_id: null,
        title: data.name,
        amount: data.price,
      }
    );
  }
  const { data } = await admin
    .from("movies")
    .select("id, title, price")
    .eq("id", item.movieId)
    .maybeSingle();
  return (
    data && {
      plan_id: null,
      days: MOVIE_ACCESS_DAYS,
      movie_id: data.id,
      title: data.title,
      amount: data.price,
    }
  );
}

/** Opens checkout, resuming an unpaid one so a reload can't lose an invoice. */
export async function startCheckout(item: CheckoutItem, token?: string): Promise<CheckoutResult> {
  const admin = getAdminClient();
  if (!admin || !qpayConfigured()) {
    return { ok: false, error: "Төлбөрийн систем тохируулагдаагүй байна." };
  }
  const userId = await userIdFromToken(token);
  if (!userId) return { ok: false, error: "Эхлээд нэвтэрнэ үү.", needsLogin: true };

  const resolved = await resolveItem(item);
  if (!resolved) return { ok: false, error: "Энэ багц эсвэл кино олдсонгүй." };
  if (item.kind === "movie" && canWatch(await accessFor(userId, item.movieId))) {
    return { ok: false, error: "Танд энэ киног үзэх эрх аль хэдийн нээлттэй байна." };
  }
  if (item.kind === "subscription" && (await accessFor(userId, "")).subscriptionUntil === "forever") {
    return { ok: false, error: "Танд хугацаагүй гишүүнчлэл идэвхтэй байна." };
  }

  const kindFilter = item.kind === "subscription" ? "plan_id" : "movie_id";
  const { data: existing } = await admin
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .eq(kindFilter, item.kind === "subscription" ? item.planId : item.movieId)
    .eq("amount", resolved.amount)
    .eq("days", resolved.days)
    .gte("created_at", new Date(Date.now() - REUSE_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let payment = existing as PaymentRow | null;
  if (!payment) {
    const { data, error } = await admin
      .from("payments")
      .insert({ ...resolved, user_id: userId, kind: item.kind })
      .select("*")
      .single();
    if (error) {
      console.error("payment insert failed:", error.message);
      return { ok: false, error: "Төлбөр үүсгэхэд алдаа гарлаа. Дахин оролдоно уу." };
    }
    payment = data as PaymentRow;
  }

  if (!payment.qpay) {
    try {
      const invoice = await createInvoice({
        ref: payment.id,
        // Tells this site's income apart from other sites on the same QPay account.
        description: `Nemo төлбөр ${payment.amount}₮`,
        amount: payment.amount,
        callbackUrl: await callbackUrl(payment.id),
      });
      const qpay = { qrImage: invoice.qrImage, shortUrl: invoice.shortUrl, urls: invoice.urls };
      const { error } = await admin
        .from("payments")
        .update({ qpay_invoice_id: invoice.invoiceId, qpay })
        .eq("id", payment.id);
      if (error) throw new Error(error.message);
      payment.qpay = qpay;
    } catch (err) {
      console.error("qpay invoice failed:", err);
      return { ok: false, error: "Төлбөрийн систем түр ажиллахгүй байна. Дараа дахин оролдоно уу." };
    }
  }

  // Kept for the purchase event, which may come from QPay's callback instead of this browser.
  // Separate and best-effort, so a missing column can't stop a payment.
  const browser = await metaBrowser();
  const { id: paymentId, title, amount } = payment;
  const metaContentId = metaContentIdOf(payment);
  after(async () => {
    await admin.from("payments").update({ meta_browser: browser }).eq("id", paymentId).then(() => {}, () => {});
    const { data: owner } = await admin.auth.admin.getUserById(userId);
    await sendMetaEvent({
      name: "InitiateCheckout",
      eventId: `checkout-${paymentId}`,
      user: { id: userId, email: owner.user?.email },
      browser,
      custom: { value: amount, currency: "MNT", contentIds: [metaContentId], contentName: title },
    });
  });

  return {
    ok: true,
    checkout: {
      id: payment.id,
      title: payment.title,
      amount: payment.amount,
      qpay: payment.qpay,
      metaContentId,
    },
  };
}

/** Polled by the checkout dialog. Only the owner of the payment gets an answer. */
export async function checkPayment(id: string, token: string | undefined): Promise<{ paid: boolean }> {
  const userId = await userIdFromToken(token);
  const payment = userId ? await getPayment(id) : null;
  if (!payment || payment.user_id !== userId) return { paid: false };
  if (payment.status === "paid") return { paid: true };

  try {
    if (await settleQpay(payment)) return { paid: true };
  } catch (err) {
    console.error("payment check failed:", err);
  }
  // Another request (e.g. QPay's callback) may have settled it meanwhile.
  return { paid: (await getPayment(id))?.status === "paid" };
}
