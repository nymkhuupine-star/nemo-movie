"use client";

import { useEffect, useState } from "react";
import { useApp, type AuthTab } from "./AppProvider";
import { authErrorMessage, getBrowserClient } from "@/lib/supabase-browser";
import { registerUser, requestPasswordReset } from "@/app/auth-actions";

const INPUT =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-accent/60";
const MIN_PASSWORD = 6;

const TITLES: Record<AuthTab, string> = {
  login: "Нэвтрэх",
  register: "Бүртгүүлэх",
  forgot: "Нууц үг сэргээх",
};

export default function AuthModal() {
  const { authOpen, openAuth, closeAuth } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!authOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeAuth();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [authOpen, closeAuth]);

  if (!authOpen) return null;
  const tab = authOpen;

  const switchTab = (next: AuthTab) => {
    setError("");
    setNotice("");
    openAuth(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Имэйл хаягаа зөв оруулна уу.");
      return;
    }
    if (tab !== "forgot" && password.length < MIN_PASSWORD) {
      setError(`Нууц үг хамгийн багадаа ${MIN_PASSWORD} тэмдэгт байна.`);
      return;
    }
    if (tab === "register" && password !== confirm) {
      setError("Нууц үг таарахгүй байна.");
      return;
    }

    const supabase = getBrowserClient();
    if (!supabase) {
      setError("Нэвтрэх систем тохируулагдаагүй байна.");
      return;
    }

    setPending(true);
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setPassword("");
        closeAuth();
      } else if (tab === "register") {
        // Account + confirmation email are created on the server (Resend).
        const res = await registerUser(email, password);
        if (!res.ok) throw new Error(res.error);
        setPassword("");
        setConfirm("");
        setNotice(
          "Бүртгэл үүслээ! Имэйл рүү тань баталгаажуулах холбоос илгээлээ.",
        );
      } else {
        const res = await requestPasswordReset(email);
        if (!res.ok) throw new Error(res.error);
        setNotice(
          "Хэрэв энэ имэйлээр бүртгэл байгаа бол нууц үг сэргээх холбоос илгээлээ. Имэйлээ шалгана уу.",
        );
      }
    } catch (err) {
      setError(
        authErrorMessage(err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && closeAuth()}
      role="dialog"
      aria-modal="true"
      aria-label={TITLES[tab]}
    >
      <div className="animate-pop-in w-full max-w-[400px] rounded-3xl border border-line bg-[#0e0e0e] p-6 shadow-2xl sm:p-7">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">{TITLES[tab]}</h2>
          <button
            type="button"
            onClick={closeAuth}
            aria-label="Хаах"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {tab === "forgot" ? (
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Бүртгэлтэй имэйлээ оруулна уу. Нууц үг шинэчлэх холбоос илгээнэ.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-2 rounded-full border border-line bg-surface p-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className={`h-9 rounded-full text-sm font-semibold transition-colors ${
                  tab === t ? "btn-accent" : "text-white/60 hover:text-white"
                }`}
              >
                {TITLES[t]}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-white/60">Имэйл хаяг</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              className={INPUT}
            />
          </label>

          {tab !== "forgot" && (
            <label className="block">
              <span className="mb-2 block text-sm text-white/60">
                Нууц үг ({MIN_PASSWORD}+ тэмдэгт)
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete={tab === "register" ? "new-password" : "current-password"}
                className={INPUT}
              />
            </label>
          )}
          {tab === "register" && (
            <label className="block">
              <span className="mb-2 block text-sm text-white/60">
                Нууц үг давтах
              </span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
                className={INPUT}
              />
            </label>
          )}

          {tab === "login" && (
            <button
              type="button"
              onClick={() => switchTab("forgot")}
              className="text-sm font-medium text-accent-light hover:underline"
            >
              Нууц үг мартсан уу?
            </button>
          )}

          {error && <p className="text-sm text-hot">{error}</p>}
          {notice && <p className="text-sm text-accent-light">{notice}</p>}

          <button
            type="submit"
            disabled={pending}
            className="btn-accent h-11 w-full rounded-xl text-sm font-semibold transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            {pending
              ? "Түр хүлээнэ үү…"
              : tab === "forgot"
                ? "Холбоос илгээх"
                : TITLES[tab]}
          </button>

          {tab === "forgot" && (
            <button
              type="button"
              onClick={() => switchTab("login")}
              className="w-full text-sm text-white/60 hover:text-white"
            >
              ← Нэвтрэх рүү буцах
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
