// Server-only helpers for the admin panel's users and stats.
import type { User } from "@supabase/supabase-js";
import { isActive, type EntitlementRow } from "./access";
import { getAdminClient } from "./supabase";

/** All auth users, newest first (paged through the admin API). */
export async function listAllUsers(): Promise<User[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const users: User[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Active entitlements grouped by user id ([] when the table is missing). */
export async function activeEntitlementsByUser(): Promise<
  Map<string, EntitlementRow[]>
> {
  const map = new Map<string, EntitlementRow[]>();
  const admin = getAdminClient();
  if (!admin) return map;
  const { data, error } = await admin.from("entitlements").select("*");
  if (error) return map;
  for (const e of (data as EntitlementRow[]).filter(isActive)) {
    map.set(e.user_id, [...(map.get(e.user_id) ?? []), e]);
  }
  return map;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
