"use client";

import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";

const INPUT =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-accent/60";

export default function AuthModal() {
  const { authOpen, openAuth, closeAuth, login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
  const isRegister = authOpen === "register";

  const switchTab = (tab: "login" | "register") => {
    setError("");
    setNotice("");
    openAuth(tab);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Имэйл хаягаа зөв оруулна уу.");
      return;
    }
    if (!/^\d{4}$/.test(password)) {
      setError("Нууц үг 4 оронтой тоо байх ёстой.");
      return;
    }
    if (isRegister && password !== confirm) {
      setError("Нууц үг таарахгүй байна.");
      return;
    }
    // Demo only: no backend yet, the session is kept in localStorage.
    login(email);
    setPassword("");
    setConfirm("");
    closeAuth();
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && closeAuth()}
      role="dialog"
      aria-modal="true"
      aria-label={isRegister ? "Бүртгүүлэх" : "Нэвтрэх"}
    >
      <div className="animate-pop-in w-full max-w-[400px] rounded-3xl border border-line bg-[#0e0e0e] p-6 shadow-2xl sm:p-7">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">
            {isRegister ? "Бүртгүүлэх" : "Нэвтрэх"}
          </h2>
          <button
            type="button"
            onClick={closeAuth}
            aria-label="Хаах"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-full border border-line bg-surface p-1">
          {(["login", "register"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchTab(tab)}
              className={`h-9 rounded-full text-sm font-semibold transition-colors ${
                authOpen === tab ? "btn-accent" : "text-white/60 hover:text-white"
              }`}
            >
              {tab === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
            </button>
          ))}
        </div>

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
          <label className="block">
            <span className="mb-2 block text-sm text-white/60">
              Нууц үг (4 орон)
            </span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              autoComplete={isRegister ? "new-password" : "current-password"}
              className={`${INPUT} tracking-[0.3em]`}
            />
          </label>
          {isRegister && (
            <label className="block">
              <span className="mb-2 block text-sm text-white/60">
                Нууц үг давтах
              </span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                autoComplete="new-password"
                className={`${INPUT} tracking-[0.3em]`}
              />
            </label>
          )}

          {!isRegister && (
            <button
              type="button"
              onClick={() =>
                setNotice("Нууц үг сэргээх холбоосыг имэйлээр илгээх болно.")
              }
              className="text-sm font-medium text-accent hover:underline"
            >
              Нууц үг мартсан уу?
            </button>
          )}

          {error && <p className="text-sm text-hot">{error}</p>}
          {notice && <p className="text-sm text-white/60">{notice}</p>}

          <button
            type="submit"
            className="btn-accent h-11 w-full rounded-xl text-sm font-semibold transition-transform hover:scale-[1.01]"
          >
            {isRegister ? "Бүртгүүлэх" : "Нэвтрэх"}
          </button>
        </form>
      </div>
    </div>
  );
}
