"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { authErrorMessage, getBrowserClient } from "@/lib/supabase-browser";

const INPUT =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-accent/60";
const MIN_PASSWORD = 6;

type Stage = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordForm() {
  const router = useRouter();
  const { openAuth } = useApp();
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // The emailed link carries ?token_hash=…&type=recovery; verifying it signs
  // the user in for this one purpose so they can set a new password.
  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage("invalid");
      return;
    }
    const tokenHash = new URLSearchParams(window.location.search).get("token_hash");
    if (tokenHash) {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error }) => {
          // Single-use token: drop it from the address bar either way.
          window.history.replaceState(null, "", "/reset-password");
          setStage(error ? "invalid" : "ready");
        });
      return;
    }

    // Fallback for links that put the session in the URL hash.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("error")) {
      setStage("invalid");
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setStage("ready");
      }
    });
    // Covers the case where the session was restored before we subscribed.
    const timer = setTimeout(async () => {
      const { data: s } = await supabase.auth.getSession();
      setStage((prev) =>
        prev === "checking" ? (s.session ? "ready" : "invalid") : prev,
      );
    }, 1500);

    return () => {
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD) {
      setError(`Нууц үг хамгийн багадаа ${MIN_PASSWORD} тэмдэгт байна.`);
      return;
    }
    if (password !== confirm) {
      setError("Нууц үг таарахгүй байна.");
      return;
    }
    setPending(true);
    const { error } = await getBrowserClient()!.auth.updateUser({ password });
    setPending(false);
    if (error) {
      setError(authErrorMessage(error.message));
      return;
    }
    setStage("done");
    // Drop the token from the address bar.
    window.history.replaceState(null, "", "/reset-password");
    setTimeout(() => router.push("/"), 2500);
  };

  if (stage === "checking") {
    return <p className="mt-4 text-sm text-muted">Холбоосыг шалгаж байна…</p>;
  }

  if (stage === "invalid") {
    return (
      <div className="mt-4 space-y-4">
        <p className="text-sm leading-relaxed text-white/70">
          Холбоос хүчингүй эсвэл хугацаа нь дууссан байна. Шинэ холбоос авна уу.
        </p>
        <button
          type="button"
          onClick={() => openAuth("forgot")}
          className="btn-accent h-11 w-full rounded-xl text-sm font-semibold"
        >
          Дахин холбоос авах
        </button>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="mt-4 space-y-4">
        <p className="text-sm text-accent-light">
          Нууц үг амжилттай шинэчлэгдлээ! Нүүр хуудас руу шилжиж байна…
        </p>
        <Link href="/" className="text-sm text-white/70 hover:text-white">
          Нүүр хуудас →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm text-white/60">
          Шинэ нууц үг ({MIN_PASSWORD}+ тэмдэгт)
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
          className={INPUT}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm text-white/60">Нууц үг давтах</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className={INPUT}
        />
      </label>
      {error && <p className="text-sm text-hot">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-accent h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Хадгалж байна…" : "Нууц үг шинэчлэх"}
      </button>
    </form>
  );
}
