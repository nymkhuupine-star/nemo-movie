"use client";

import { useEffect, useState } from "react";
import { useApp, type AuthTab } from "./AppProvider";
import { authErrorMessage, getBrowserClient } from "@/lib/supabase-browser";
import {
  loginWithPin,
  registerUser,
  requestPinReset,
  resetPinWithCode,
} from "@/app/auth-actions";
import { isPin, PIN_ERROR, pinInput } from "@/lib/pin";

const INPUT =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-accent/60";

const TITLES: Record<AuthTab, string> = {
  login: "Нэвтрэх",
  register: "Бүртгүүлэх",
  forgot: "Нууц үг сэргээх",
  reset: "Нууц үг сэргээх",
};

const SUBMIT_LABELS: Record<AuthTab, string> = {
  ...TITLES,
  forgot: "Код илгээх",
  reset: "Нууц үг шинэчлэх",
};

export default function AuthModal() {
  const { authOpen, openAuth, closeAuth, finishAuth } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
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
  const newPin = tab === "register" || tab === "reset";

  const switchTab = (next: AuthTab, message = "") => {
    setError("");
    setNotice(message);
    setPassword("");
    setConfirm("");
    setCode("");
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
    if (tab === "reset" && !/^\d{6}$/.test(code)) {
      setError("Имэйлээр ирсэн 6 оронтой кодоо оруулна уу.");
      return;
    }
    if (tab !== "forgot" && !isPin(password)) {
      setError(PIN_ERROR);
      return;
    }
    if (newPin && password !== confirm) {
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
      // FormData keeps the PIN out of dev server action logs.
      const form = new FormData();
      form.set("email", email);
      form.set("password", password);

      const signIn = async (session: { accessToken: string; refreshToken: string }) => {
        const { error } = await supabase.auth.setSession({
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
        });
        if (error) throw error;
        setPassword("");
        setConfirm("");
        setCode("");
        finishAuth();
      };

      if (tab === "login") {
        const res = await loginWithPin(form);
        if (res.ok) {
          await signIn(res);
        } else if (res.locked) {
          switchTab("reset", res.error);
        } else {
          setPassword("");
          setError(res.error);
        }
      } else if (tab === "register") {
        const res = await registerUser(form);
        if (!res.ok) throw new Error(res.error);
        await signIn(res);
      } else if (tab === "forgot") {
        const res = await requestPinReset(email);
        if (!res.ok) throw new Error(res.error);
        switchTab("reset", "Хэрэв энэ имэйлээр бүртгэл байгаа бол код илгээлээ. Имэйлээ шалгана уу.");
      } else {
        form.set("code", code);
        const res = await resetPinWithCode(form);
        if (!res.ok) throw new Error(res.error);
        await signIn(res);
      }
    } catch (err) {
      setError(
        authErrorMessage(err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    setError("");
    setNotice("");
    setPending(true);
    try {
      const res = await requestPinReset(email);
      if (res.ok) setNotice("Шинэ код авах хүсэлт илгээлээ. Нэг минутад нэг удаа илгээнэ.");
      else setError(res.error);
    } catch {
      setError("Код илгээж чадсангүй. Дахин оролдоно уу.");
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
            Бүртгэлтэй имэйлээ оруулна уу. Нууц үг шинэчлэх код илгээнэ.
          </p>
        ) : tab === "reset" ? (
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Имэйлээр ирсэн кодоо оруулаад шинэ нууц үгээ тавина уу.
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
            {tab === "register" && (
              <span className="mt-2 block text-xs leading-relaxed text-price">
                Имэйлээ зөв бичээрэй, нууц үг сэргээх код энэ хаяг руу очно.
              </span>
            )}
          </label>

          {tab === "reset" && (
            <label className="block">
              <span className="mb-2 block text-sm text-white/60">Имэйлээр ирсэн код</span>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                autoComplete="one-time-code"
                className={INPUT}
              />
            </label>
          )}

          {tab !== "forgot" && (
            <label className="block">
              <span className="mb-2 block text-sm text-white/60">
                {tab === "reset" ? "Шинэ нууц үг" : "Нууц үг"} (4 оронтой тоо)
              </span>
              <input
                type="password"
                inputMode="numeric"
                value={password}
                onChange={(e) => setPassword(pinInput(e.target.value))}
                placeholder="••••"
                autoComplete={newPin ? "new-password" : "current-password"}
                className={INPUT}
              />
            </label>
          )}
          {newPin && (
            <label className="block">
              <span className="mb-2 block text-sm text-white/60">
                Нууц үг давтах
              </span>
              <input
                type="password"
                inputMode="numeric"
                value={confirm}
                onChange={(e) => setConfirm(pinInput(e.target.value))}
                placeholder="••••"
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
            {pending ? "Түр хүлээнэ үү…" : SUBMIT_LABELS[tab]}
          </button>

          {tab === "reset" && (
            <button
              type="button"
              onClick={resend}
              disabled={pending}
              className="w-full text-sm font-medium text-accent-light hover:underline disabled:opacity-60"
            >
              Код дахин авах
            </button>
          )}

          {(tab === "forgot" || tab === "reset") && (
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
