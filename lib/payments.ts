// Server-only: turns a confirmed QPay payment into an entitlement.
import { findPaidPayment, type QpayLink } from "./qpay";
import { getAdminClient } from "./supabase";

/** Unpaid invoices are asked about for this long; QPay's callback still works after. */
const POLL_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export type PaymentRow = {
  id: string;
  user_id: string;
  kind: "subscription" | "movie";
  plan_id: string | null;
  days: number | null;
  movie_id: string | null;
  title: string;
  amount: number;
  status: "pending" | "paid";
  qpay_invoice_id: string | null;
  qpay: { qrImage: string; shortUrl: string; urls: QpayLink[] } | null;
  created_at: string;
};

function db() {
  const client = getAdminClient();
  if (!client) throw new Error("Supabase тохируулаагүй байна.");
  return client;
}

function pollCutoff(): string {
  return new Date(Date.now() - POLL_WINDOW_MS).toISOString();
}

export async function getPayment(id: string): Promise<PaymentRow | null> {
  const { data } = await db().from("payments").select("*").eq("id", id).maybeSingle();
  return data as PaymentRow | null;
}

/**
 * Asks QPay about the invoice, never trusting the caller. On payment, the
 * database marks it paid and grants access in one transaction; exactly one
 * caller wins when the callback, polling and scheduled job overlap.
 */
export async function settleQpay(p: PaymentRow): Promise<boolean> {
  if (p.status === "paid" || !p.qpay_invoice_id) return p.status === "paid";
  const paymentId = await findPaidPayment(p.qpay_invoice_id, p.amount);
  if (!paymentId) return false;
  const { data, error } = await db().rpc("settle_payment", {
    p_id: p.id,
    p_ref: `qpay:${paymentId}`,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/** Scheduled job: settles everything, whether or not the customer is online. */
export async function syncAllPayments(): Promise<void> {
  const { data, error } = await db()
    .from("payments")
    .select("*")
    .eq("status", "pending")
    .gte("created_at", pollCutoff());
  if (error) throw new Error(error.message);
  for (const p of (data ?? []) as PaymentRow[]) {
    // One failing invoice mustn't hold up the rest.
    await settleQpay(p).catch((err) => console.error("qpay sync failed:", p.id, err));
  }
}

/** Called before saying a user has no access, in case a payment just landed. Never throws. */
export async function settleUserPayments(userId: string): Promise<void> {
  try {
    const { data } = await db()
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gte("created_at", pollCutoff());
    for (const p of (data ?? []) as PaymentRow[]) await settleQpay(p);
  } catch (err) {
    console.error("settling user payments failed:", err);
  }
}
