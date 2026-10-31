// Server-only, uncached reads for admin pages (always fresh).
import { listAllUsers } from "./admin-users";
import { SAMPLE_PLANS, type Plan } from "./movies";
import { getAdminClient } from "./supabase";

/** All plans including inactive ones. `missing` when the table doesn't exist. */
export async function adminPlans(): Promise<{ plans: Plan[]; missing: boolean }> {
  const admin = getAdminClient();
  if (!admin) return { plans: SAMPLE_PLANS, missing: true };
  const { data, error } = await admin
    .from("plans")
    .select("*")
    .order("sort")
    .order("price");
  if (error) return { plans: SAMPLE_PLANS, missing: true };
  return {
    plans: (data as (Plan & { badge: string | null })[]).map((p) => ({
      ...p,
      badge: p.badge ?? undefined,
    })),
    missing: false,
  };
}

export type PaidPayment = {
  id: string;
  amount: number;
  paidAt: string;
  title: string;
  /** Groups payments for the same movie or plan. */
  itemKey: string;
  email: string | null;
};

type PaidRow = {
  id: string;
  user_id: string;
  kind: "subscription" | "movie";
  plan_id: string | null;
  movie_id: string | null;
  title: string;
  amount: number;
  paid_at: string;
};

/**
 * Money actually received through QPay, newest first; manually granted access
 * doesn't count. Null when the table doesn't exist.
 */
export async function adminPaidPayments(): Promise<PaidPayment[] | null> {
  const admin = getAdminClient();
  if (!admin) return null;
  const rows: PaidRow[] = [];
  // Supabase returns at most 1000 rows per request, which would cut off the totals.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("payments")
      .select("id, user_id, kind, plan_id, movie_id, title, amount, paid_at")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .order("id")
      .range(from, from + 999);
    if (error) return null;
    rows.push(...(data as PaidRow[]));
    if (data.length < 1000) break;
  }
  const emails = new Map((await listAllUsers()).map((u) => [u.id, u.email ?? null]));
  return rows.map((p) => ({
    id: p.id,
    amount: p.amount,
    paidAt: p.paid_at,
    title: p.kind === "subscription" ? `Гишүүнчлэл · ${p.title}` : p.title,
    itemKey: p.kind === "subscription" ? `plan:${p.plan_id}` : `movie:${p.movie_id ?? p.title}`,
    email: emails.get(p.user_id) ?? null,
  }));
}

export type MovieOption = {
  id: string;
  title: string;
  genre: string;
  episodes: number | null;
  featured: boolean;
  trending: boolean;
  hero_order: number | null;
  trend_order: number | null;
  poster_url: string | null;
  hue: number;
};

/** Lightweight movie list for selects and the order editors. */
export async function adminMovieOptions(): Promise<MovieOption[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const { data, error } = await admin.from("movies").select("*").order("title");
  if (error) return [];
  return (data as Partial<MovieOption>[]).map((m) => ({
    id: m.id!,
    title: m.title!,
    genre: m.genre!,
    episodes: m.episodes ?? null,
    featured: Boolean(m.featured),
    trending: Boolean(m.trending),
    // Order columns may not exist before admin.sql / admin2.sql are run.
    hero_order: m.hero_order ?? null,
    trend_order: m.trend_order ?? null,
    poster_url: m.poster_url ?? null,
    hue: m.hue ?? 280,
  }));
}
