"use client";

import { useState } from "react";
import CheckoutModal from "./CheckoutModal";
import { useApp } from "./AppProvider";

export default function PlanButton({
  planId,
  highlight,
}: {
  planId: string;
  highlight: boolean;
}) {
  const { user, openAuth } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={() => (user ? setOpen(true) : openAuth("login"))}
        className={`h-11 rounded-full px-6 text-sm font-semibold transition-transform hover:scale-[1.03] ${
          highlight ? "btn-accent" : "border border-line bg-white/5"
        }`}
      >
        Авах
      </button>
      {open && (
        <CheckoutModal item={{ kind: "subscription", planId }} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
