"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_* values are inlined at build time, so reference them directly.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null | undefined;

/** Browser Supabase client for site users (auth). Null when env is missing. */
export function getBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    url && anonKey
      ? createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // Implicit flow lets a reset link work on any device/browser.
            flowType: "implicit",
          },
        })
      : null;
  return client;
}

/** Supabase auth errors → Mongolian messages. */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Имэйл эсвэл нууц үг буруу байна.";
  if (m.includes("email not confirmed"))
    return "Имэйлээ баталгаажуулна уу. Таны имэйл рүү холбоос илгээсэн.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Энэ имэйлээр бүртгэл үүссэн байна. Нэвтэрнэ үү.";
  if (m.includes("password should be") || m.includes("at least"))
    return "Нууц үг хамгийн багадаа 6 тэмдэгт байна.";
  if (m.includes("same") && m.includes("password"))
    return "Шинэ нууц үг хуучнаасаа өөр байх ёстой.";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.";
  return message;
}
