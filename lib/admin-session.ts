// Signed admin session cookie. Uses Web Crypto so it works in proxy.ts and
// in Server Actions alike.

export const ADMIN_COOKIE = "nemo_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret(): string | undefined {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
}

async function hmac(value: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(value));
  return Array.from(new Uint8Array(sig), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  const key = secret();
  if (!key) throw new Error("ADMIN_PASSWORD is not set");
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS);
  return `${expires}.${await hmac(expires, key)}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  const key = secret();
  if (!token || !key) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig) return false;
  if (Number(expires) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(expires, key));
}

/** Constant-time password check against ADMIN_PASSWORD. */
export async function checkPassword(input: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Compare HMACs so the comparison length never leaks the password length.
  const k = "nemo-admin-password-check";
  return safeEqual(await hmac(input, k), await hmac(expected, k));
}
