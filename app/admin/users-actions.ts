"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isActive, listEntitlements } from "@/lib/access";
import { adminPlans } from "@/lib/admin-data";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";
import { getAdminClient } from "@/lib/supabase";

const DAY = 24 * 60 * 60 * 1000;

async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionToken(token))) redirect("/admin/login");
}

function db() {
  const client = getAdminClient();
  if (!client) throw new Error("Supabase тохируулаагүй байна.");
  return client;
}

function back(userId: string, notice: string): never {
  redirect(`/admin/users/${userId}?notice=${notice}`);
}

/**
 * Grants a subscription for a plan's duration. If the user already has an
 * active subscription, the new period starts when the current one ends.
 */
export async function grantSubscription(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  const plan = (await adminPlans()).plans.find((p) => p.id === planId);
  if (!userId || !plan) back(userId, "error");

  const current = (await listEntitlements(userId))
    .filter((e) => e.kind === "subscription" && isActive(e))
    .map((e) => (e.expires_at ? new Date(e.expires_at).getTime() : Infinity));
  if (current.includes(Infinity)) back(userId, "already-forever");
  const start = Math.max(Date.now(), ...current);

  const { error } = await db().from("entitlements").insert({
    user_id: userId,
    kind: "subscription",
    plan_id: plan.id,
    expires_at: new Date(start + plan.days * DAY).toISOString(),
    note: note ?? `${plan.name} (${plan.price.toLocaleString("en-US")}₮)`,
  });
  back(userId, error ? "error" : "granted");
}

/** Unlocks one movie/series for the user, forever or for N days. */
export async function grantMovie(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const movieId = String(formData.get("movieId") ?? "");
  const days = Number(formData.get("days") || 0);
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!userId || !movieId) back(userId, "error");

  const { error } = await db().from("entitlements").insert({
    user_id: userId,
    kind: "movie",
    movie_id: movieId,
    expires_at: days > 0 ? new Date(Date.now() + days * DAY).toISOString() : null,
    note,
  });
  back(userId, error ? "error" : "granted");
}

export async function revokeEntitlement(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const id = String(formData.get("id") ?? "");
  const { error } = await db()
    .from("entitlements")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  back(userId, error ? "error" : "revoked");
}

export async function deleteUser(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const { error } = await db().auth.admin.deleteUser(userId);
  if (error) back(userId, "error");
  redirect("/admin/users?deleted=1");
}
