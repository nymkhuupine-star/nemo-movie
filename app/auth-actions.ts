"use server";

import { after } from "next/server";
import { codeEmail, emailConfigured, sendEmail } from "@/lib/email";
import { metaBrowser, sendMetaEvent } from "@/lib/meta-capi";
import { isPin, PIN_ERROR } from "@/lib/pin";
import {
  hashResetCode,
  newResetCode,
  pinConfigured,
  pinToPassword,
  sameHash,
} from "@/lib/pin-server";
import { getAdminClient, getPublicClient } from "@/lib/supabase";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

export type LoginResult =
  | { ok: true; accessToken: string; refreshToken: string; metaEventId?: string }
  | { ok: false; error: string; locked?: boolean };

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const COOLDOWN_MS = 60_000;
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_CODE_ATTEMPTS = 5;
const CODE_LIFETIME_MS = 15 * 60_000;
const MAX_CODE_REQUESTS = 5;
const CODE_REQUEST_WINDOW_MS = 15 * 60_000;

// Best-effort throttle so one address can't be spammed (per server instance).
const lastSent = new Map<string, number>();
function throttled(key: string): boolean {
  const now = Date.now();
  const prev = lastSent.get(key) ?? 0;
  if (now - prev < COOLDOWN_MS) return true;
  lastSent.set(key, now);
  return false;
}

// Same best-effort limit on asking for reset codes.
const codeRequests = new Map<string, { count: number; since: number }>();
function tooManyCodeRequests(email: string): boolean {
  const now = Date.now();
  const entry = codeRequests.get(email);
  if (!entry || now - entry.since > CODE_REQUEST_WINDOW_MS) {
    codeRequests.set(email, { count: 1, since: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_CODE_REQUESTS;
}

function setupError(): { ok: false; error: string } | null {
  if (!getAdminClient()) return { ok: false, error: "Supabase тохируулаагүй байна." };
  if (!pinConfigured()) return { ok: false, error: "Нэвтрэх систем тохируулагдаагүй байна." };
  if (!emailConfigured()) {
    return { ok: false, error: "Имэйл илгээх тохиргоо (RESEND_API_KEY) хийгдээгүй байна." };
  }
  return null;
}

/** Hands the browser a session after the PIN was just set. */
async function sessionFor(email: string, pin: string): Promise<LoginResult> {
  const { data, error } = await getPublicClient()!.auth.signInWithPassword({
    email,
    password: pinToPassword(email, pin),
  });
  if (error || !data.session) {
    return { ok: false, error: "Нууц үг хадгалагдлаа. Одоо нэвтэрч орно уу." };
  }
  return {
    ok: true,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

/**
 * Creates the account and signs straight in, with no confirmation email. Takes
 * FormData so the password never shows up in dev server action logs.
 */
export async function registerUser(form: FormData): Promise<LoginResult> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const pin = String(form.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Имэйл хаягаа зөв оруулна уу." };
  if (!isPin(pin)) return { ok: false, error: PIN_ERROR };
  const setup = setupError();
  if (setup) return setup;
  if (throttled(`signup:${email}`)) {
    return { ok: false, error: "Түр хүлээгээд дахин оролдоно уу." };
  }

  const { data: created, error } = await getAdminClient()!.auth.admin.createUser({
    email,
    password: pinToPassword(email, pin),
    email_confirm: true,
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (error.code === "email_exists" || (m.includes("already") && m.includes("registered"))) {
      return { ok: false, error: "Энэ имэйл хаяг аль хэдийн бүртгэлтэй байна." };
    }
    return { ok: false, error: error.message };
  }

  // Failed guesses made before this account existed shouldn't count against it.
  await getAdminClient()!.from("login_guards").delete().eq("email", email);

  const metaEventId = `register-${created.user.id}`;
  const browser = await metaBrowser();
  after(() =>
    sendMetaEvent({
      name: "CompleteRegistration",
      eventId: metaEventId,
      user: { id: created.user.id, email },
      browser,
    }),
  );

  const session = await sessionFor(email, pin);
  return session.ok ? { ...session, metaEventId } : session;
}

/**
 * Emails a reset code. Does nothing visible for unknown addresses, so this
 * can't be used to discover which emails have accounts.
 */
async function sendResetCode(email: string): Promise<void> {
  const admin = getAdminClient()!;
  // Kept in the database so the limit holds across server instances.
  const { data: guard } = await admin
    .from("login_guards")
    .select("reset_sent_at")
    .eq("email", email)
    .maybeSingle();
  const sentAt = guard?.reset_sent_at ? new Date(guard.reset_sent_at).getTime() : 0;
  if (Date.now() - sentAt < COOLDOWN_MS) return;

  // Only used to find the account; the link it produces is never sent.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (linkError || !link.user) return;

  const code = newResetCode();
  const { error } = await admin.from("login_guards").upsert({
    email,
    reset_user_id: link.user.id,
    reset_code_hash: hashResetCode(email, code),
    reset_expires_at: new Date(Date.now() + CODE_LIFETIME_MS).toISOString(),
    reset_failed: 0,
    reset_sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  await sendEmail({
    to: email,
    subject: `Nemo Kino — нууц үг сэргээх код: ${code}`,
    ...codeEmail({
      heading: "Нууц үг сэргээх код",
      body: "Доорх кодыг сайт дээр оруулж шинэ нууц үгээ тавина уу. Код 15 минутын дотор хүчинтэй.",
      code,
      footnote: "Хэрэв та хүсэлт илгээгээгүй бол хэн нэгэн таны нууц үгийг таахыг оролдсон байж болзошгүй. Энэ кодыг хэнд ч бүү өгөөрэй.",
    }),
  });
}

async function lockedResult(email: string): Promise<LoginResult> {
  try {
    await sendResetCode(email);
  } catch (e) {
    console.error("[email] reset code failed:", e);
  }
  return {
    ok: false,
    locked: true,
    error: `${MAX_LOGIN_ATTEMPTS} удаа буруу оруулсан тул бүртгэл түгжигдлээ. Бүртгэлтэй имэйл бол код илгээлээ. Кодоор нууц үгээ сэргээнэ үү.`,
  };
}

/**
 * Signs in on the server so every guess is counted; the browser only receives
 * the session once the PIN is right. Locks after MAX_LOGIN_ATTEMPTS wrong tries.
 */
export async function loginWithPin(form: FormData): Promise<LoginResult> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const pin = String(form.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Имэйл хаягаа зөв оруулна уу." };
  if (!isPin(pin)) return { ok: false, error: PIN_ERROR };
  const setup = setupError();
  if (setup) return setup;

  const admin = getAdminClient()!;
  const { data: count, error: claimError } = await admin.rpc("claim_login_attempt", {
    p_email: email,
    p_max: MAX_LOGIN_ATTEMPTS,
  });
  if (claimError) {
    console.error("login guard failed:", claimError.message);
    return { ok: false, error: "Нэвтрэх систем түр ажиллахгүй байна." };
  }
  if (count === -1) return lockedResult(email);

  const { data, error } = await getPublicClient()!.auth.signInWithPassword({
    email,
    password: pinToPassword(email, pin),
  });

  if (!error && data.session) {
    await admin.from("login_guards").delete().eq("email", email);
    return {
      ok: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }
  if (error?.code === "email_not_confirmed") {
    // The PIN was right. Accounts from when sign-up needed an emailed link
    // would otherwise stay shut out, now that no new link is ever sent.
    await admin.from("login_guards").delete().eq("email", email);
    const { data: link } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (link.user) await admin.auth.admin.updateUserById(link.user.id, { email_confirm: true });
    return sessionFor(email, pin);
  }
  if (error && error.code !== "invalid_credentials") {
    // Rate limit or outage: says nothing about the PIN, so don't count it.
    await admin.rpc("release_login_attempt", { p_email: email });
    return { ok: false, error: "Түр хүлээгээд дахин оролдоно уу." };
  }

  if (count >= MAX_LOGIN_ATTEMPTS) return lockedResult(email);
  return {
    ok: false,
    error: `Имэйл эсвэл нууц үг буруу байна. ${MAX_LOGIN_ATTEMPTS - count} оролдлого үлдлээ.`,
  };
}

/** "Forgot password": sends a code. Always reports success for valid addresses. */
export async function requestPinReset(email: string): Promise<AuthActionResult> {
  email = email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Имэйл хаягаа зөв оруулна уу." };
  const setup = setupError();
  if (setup) return setup;
  if (tooManyCodeRequests(email)) {
    return { ok: false, error: "Оролдлого хэт олон. 15 минутын дараа дахин оролдоно уу." };
  }
  try {
    await sendResetCode(email);
  } catch (e) {
    console.error("[email] reset code failed:", e);
    return { ok: false, error: "Код илгээж чадсангүй. Дахин оролдоно уу." };
  }
  return { ok: true };
}

/** Checks the emailed code, sets the new PIN, lifts any lock and signs in. */
export async function resetPinWithCode(form: FormData): Promise<LoginResult> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const code = String(form.get("code") ?? "").trim();
  const pin = String(form.get("password") ?? "");
  if (!isPin(pin)) return { ok: false, error: PIN_ERROR };
  const setup = setupError();
  if (setup) return setup;

  const badCode = { ok: false as const, error: "Код буруу эсвэл хугацаа дууссан байна." };
  const admin = getAdminClient()!;
  const { data: count, error: claimError } = await admin.rpc("claim_reset_attempt", {
    p_email: email,
    p_max: MAX_CODE_ATTEMPTS,
  });
  if (claimError) {
    console.error("reset guard failed:", claimError.message);
    return { ok: false, error: "Нэвтрэх систем түр ажиллахгүй байна." };
  }
  if (count === -1) return badCode;

  const { data: guard } = await admin
    .from("login_guards")
    .select("reset_user_id, reset_code_hash")
    .eq("email", email)
    .maybeSingle();
  if (!guard?.reset_code_hash || !guard.reset_user_id) return badCode;

  if (!sameHash(guard.reset_code_hash, hashResetCode(email, code))) return badCode;

  const { error } = await admin.auth.admin.updateUserById(guard.reset_user_id, {
    password: pinToPassword(email, pin),
    // The code reached their inbox, which proves they own the address.
    email_confirm: true,
  });
  if (error) {
    console.error("pin reset failed:", error.message);
    return { ok: false, error: "Нууц үг шинэчилж чадсангүй. Дахин оролдоно уу." };
  }
  await admin.from("login_guards").delete().eq("email", email);
  return sessionFor(email, pin);
}
