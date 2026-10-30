"use server";

import { headers } from "next/headers";
import { actionEmail, emailConfigured, sendEmail } from "@/lib/email";
import { getAdminClient } from "@/lib/supabase";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD = 6;
const COOLDOWN_MS = 60_000;

// Best-effort throttle so one address can't be spammed (per server instance).
const lastSent = new Map<string, number>();
function throttled(key: string): boolean {
  const now = Date.now();
  const prev = lastSent.get(key) ?? 0;
  if (now - prev < COOLDOWN_MS) return true;
  lastSent.set(key, now);
  return false;
}

/** Links point at our own domain, never at a host supplied by the browser. */
async function siteUrl(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function setupError(): AuthActionResult | null {
  if (!getAdminClient()) return { ok: false, error: "Supabase тохируулаагүй байна." };
  if (!emailConfigured()) {
    return { ok: false, error: "Имэйл илгээх тохиргоо (RESEND_API_KEY) хийгдээгүй байна." };
  }
  return null;
}

/**
 * Creates the account and emails a confirmation link via Resend. Takes
 * FormData so the password never shows up in dev server action logs.
 */
export async function registerUser(form: FormData): Promise<AuthActionResult> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Имэйл хаягаа зөв оруулна уу." };
  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `Нууц үг хамгийн багадаа ${MIN_PASSWORD} тэмдэгт байна.` };
  }
  const setup = setupError();
  if (setup) return setup;
  if (throttled(`signup:${email}`)) {
    return { ok: false, error: "Түр хүлээгээд дахин оролдоно уу." };
  }

  const { data, error } = await getAdminClient()!.auth.admin.generateLink({
    type: "signup",
    email,
    password,
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already") && m.includes("registered")) {
      return { ok: false, error: "Энэ имэйлээр бүртгэл үүссэн байна. Нэвтэрнэ үү." };
    }
    return { ok: false, error: error.message };
  }

  const url = `${await siteUrl()}/auth/confirm?token_hash=${encodeURIComponent(
    data.properties.hashed_token,
  )}&type=signup`;
  await sendEmail({
    to: email,
    subject: "Nemo Kino — бүртгэлээ баталгаажуулна уу",
    ...actionEmail({
      heading: "Тавтай морил!",
      body: "Nemo Kino-д бүртгүүлсэнд баярлалаа. Доорх товчийг дарж имэйл хаягаа баталгаажуулна уу.",
      button: "Имэйл баталгаажуулах",
      url,
      footnote: "Хэрэв та бүртгүүлээгүй бол энэ имэйлийг үл тоомсорлоно уу.",
    }),
  });
  return { ok: true };
}

/**
 * Emails a password reset link via Resend. Always reports success so the
 * form can't be used to discover which emails have accounts.
 */
export async function requestPasswordReset(
  email: string,
): Promise<AuthActionResult> {
  email = email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Имэйл хаягаа зөв оруулна уу." };
  const setup = setupError();
  if (setup) return setup;
  if (throttled(`reset:${email}`)) return { ok: true };

  const { data, error } = await getAdminClient()!.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (error || !data.properties?.hashed_token) return { ok: true };

  const url = `${await siteUrl()}/reset-password?token_hash=${encodeURIComponent(
    data.properties.hashed_token,
  )}&type=recovery`;
  try {
    await sendEmail({
      to: email,
      subject: "Nemo Kino — нууц үг сэргээх",
      ...actionEmail({
        heading: "Нууц үг сэргээх",
        body: "Таны бүртгэлийн нууц үгийг шинэчлэх хүсэлт ирлээ. Доорх товчийг дарж шинэ нууц үгээ оруулна уу. Холбоос 1 цагийн дотор хүчинтэй.",
        button: "Нууц үг шинэчлэх",
        url,
        footnote: "Хэрэв та хүсэлт илгээгээгүй бол энэ имэйлийг үл тоомсорлоно уу. Таны нууц үг өөрчлөгдөхгүй.",
      }),
    });
  } catch (e) {
    console.error("[email] reset email failed:", e);
    return { ok: false, error: "Имэйл илгээж чадсангүй. Дахин оролдоно уу." };
  }
  return { ok: true };
}
