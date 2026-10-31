// Server-only. A 4-digit PIN is trivial to guess, so what Supabase stores is
// derived with a secret only this server knows. Guessing straight against
// Supabase therefore can't work, and every attempt has to pass our lockout.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

function hmac(input: string): string {
  const secret = process.env.PIN_SECRET;
  if (!secret) throw new Error("PIN_SECRET тохируулаагүй байна.");
  return createHmac("sha256", secret).update(input).digest("hex");
}

export function pinConfigured(): boolean {
  return Boolean(process.env.PIN_SECRET);
}

export function pinToPassword(email: string, pin: string): string {
  return `Np-1${hmac(`pin:${email}:${pin}`)}`;
}

export function newResetCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function hashResetCode(email: string, code: string): string {
  return hmac(`reset:${email}:${code}`);
}

export function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
