"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { getBrowserClient } from "@/lib/supabase-browser";

type Stage = "checking" | "done" | "invalid";

export default function ConfirmEmail() {
  const { openAuth } = useApp();
  const [stage, setStage] = useState<Stage>("checking");

  // Verifying the emailed token confirms the address and signs the user in.
  useEffect(() => {
    const supabase = getBrowserClient();
    const tokenHash = new URLSearchParams(window.location.search).get("token_hash");
    if (!supabase || !tokenHash) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage("invalid");
      return;
    }
    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: "signup" })
      .then(({ error }) => {
        window.history.replaceState(null, "", "/auth/confirm");
        setStage(error ? "invalid" : "done");
      });
  }, []);

  if (stage === "checking") {
    return <p className="mt-4 text-sm text-muted">Баталгаажуулж байна…</p>;
  }

  if (stage === "invalid") {
    return (
      <div className="mt-4 space-y-4">
        <p className="text-sm leading-relaxed text-white/70">
          Холбоос хүчингүй эсвэл аль хэдийн ашиглагдсан байна. Имэйл тань
          баталгаажсан бол шууд нэвтэрч болно.
        </p>
        <button
          type="button"
          onClick={() => openAuth("login")}
          className="btn-accent h-11 w-full rounded-xl text-sm font-semibold"
        >
          Нэвтрэх
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-accent-light">
        Имэйл амжилттай баталгаажлаа! Та нэвтэрсэн байна.
      </p>
      <Link
        href="/"
        className="btn-accent flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold"
      >
        Кино үзэх
      </Link>
    </div>
  );
}
