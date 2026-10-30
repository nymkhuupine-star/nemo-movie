"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/admin/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    login,
    {},
  );

  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm text-white/60">Нууц үг</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="h-11 w-full rounded-xl border border-line bg-surface-2 px-4 text-sm text-white outline-none focus:border-accent/60"
        />
      </label>
      {state.error && <p className="text-sm text-hot">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-accent h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Шалгаж байна…" : "Нэвтрэх"}
      </button>
    </form>
  );
}
