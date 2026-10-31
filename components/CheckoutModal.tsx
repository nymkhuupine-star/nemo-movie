"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "./AppProvider";
import {
  checkPayment,
  startCheckout,
  type CheckoutItem,
  type CheckoutView,
} from "@/app/payment-actions";
import { trackMeta } from "@/lib/meta-pixel";
import { formatPrice } from "@/lib/movies";
import { getAccessToken } from "@/lib/supabase-browser";

const POLL_MS = 4000;

const metaParams = (c: CheckoutView) => ({
  content_ids: [c.metaContentId],
  content_name: c.title,
  content_type: "product",
  value: c.amount,
  currency: "MNT",
});

function QpayPanel({ qpay }: { qpay: CheckoutView["qpay"] }) {
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element -- inline data from QPay */}
      <img
        src={`data:image/png;base64,${qpay.qrImage}`}
        alt="QPay QR код"
        className="mx-auto h-52 w-52 rounded-xl bg-white p-2"
      />
      <p className="mt-3 text-center text-sm text-white/60">
        Банкны аппаараа QR кодыг уншуулж төлнө үү. Төлсний дараа энэ цонхыг хааж болно.
      </p>
      {qpay.urls.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2 sm:hidden">
          {qpay.urls.map((bank) => (
            <a
              key={bank.name}
              href={bank.link}
              className="flex flex-col items-center gap-1 rounded-xl bg-surface-2 p-2 text-center text-[11px] leading-tight text-white/70"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- logos hosted by QPay */}
              <img src={bank.logo} alt="" loading="lazy" className="h-9 w-9 rounded-lg" />
              {bank.description}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CheckoutModal({
  item,
  onClose,
  onPaid,
}: {
  item: CheckoutItem;
  onClose: () => void;
  onPaid?: () => void;
}) {
  const { logout, openAuth } = useApp();
  const [checkout, setCheckout] = useState<CheckoutView | null>(null);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await startCheckout(item, await getAccessToken());
        if (cancelled) return;
        if (res.ok) {
          setCheckout(res.checkout);
          trackMeta("InitiateCheckout", metaParams(res.checkout), `checkout-${res.checkout.id}`);
        } else if (res.needsLogin) {
          // The saved session looked signed in but the server rejected it.
          await logout();
          onClose();
          openAuth("login");
        } else {
          setError(res.error);
        }
      } catch {
        if (!cancelled) setError("Төлбөр эхлүүлэхэд алдаа гарлаа. Дахин оролдоно уу.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // `item` is rebuilt on each parent render; one dialog is one checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const id = checkout?.id;
  useEffect(() => {
    if (!id || paid) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await checkPayment(id, await getAccessToken());
        if (cancelled) return;
        if (res.paid) {
          setPaid(true);
          if (checkout) trackMeta("Purchase", metaParams(checkout), `purchase-${id}`);
          onPaid?.();
          return;
        }
      } catch {
        // A dropped connection shouldn't end checkout; try again next tick.
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, paid]);

  useEffect(() => {
    // Capture first: the movie dialog underneath also closes on Escape.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  // Portal: an animated parent dialog would otherwise trap this fixed overlay.
  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Төлбөр төлөх"
    >
      <div className="animate-pop-in relative my-auto w-full max-w-[420px] rounded-2xl border border-line bg-[#0e0e0e] p-5 shadow-2xl sm:p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Хаах"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10"
        >
          ✕
        </button>

        {paid ? (
          <div className="py-8 text-center">
            <p className="text-4xl text-accent-light">✓</p>
            <h2 className="mt-3 text-xl font-bold">Төлбөр амжилттай</h2>
            <p className="mt-2 text-sm text-white/60">{checkout?.title}: эрх нээгдлээ.</p>
            <button
              type="button"
              onClick={onClose}
              className="btn-accent mt-6 h-11 rounded-full px-8 text-sm font-semibold"
            >
              Үргэлжлүүлэх
            </button>
          </div>
        ) : error ? (
          <p className="py-10 pr-8 text-center text-sm text-price">{error}</p>
        ) : !checkout ? (
          <p className="py-16 text-center text-sm text-white/60">Төлбөр бэлдэж байна…</p>
        ) : (
          <>
            <h2 className="pr-8 text-lg font-bold tracking-tight">{checkout.title}</h2>
            <p className="mt-1 text-2xl font-black tracking-tight">
              {formatPrice(checkout.amount)}
            </p>

            <div className="mt-4">
              <QpayPanel qpay={checkout.qpay} />
            </div>

            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Төлбөр хүлээж байна…
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
