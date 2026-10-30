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
  hero_order: number | null;
  poster_url: string | null;
  hue: number;
};

/** Lightweight movie list for selects and the hero editor. */
export async function adminMovieOptions(): Promise<MovieOption[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("movies")
    .select("id, title, genre, episodes, featured, hero_order, poster_url, hue")
    .order("title");
  if (!error) return data as MovieOption[];

  // hero_order doesn't exist until admin.sql has been run.
  const fallback = await admin
    .from("movies")
    .select("id, title, genre, episodes, featured, poster_url, hue")
    .order("title");
  return ((fallback.data ?? []) as Omit<MovieOption, "hero_order">[]).map((m) => ({
    ...m,
    hero_order: null,
  }));
}
