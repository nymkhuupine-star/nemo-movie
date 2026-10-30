// Server-only, uncached reads for admin pages (always fresh).
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
