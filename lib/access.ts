// Server-only: who is signed in, and what they're allowed to watch.
import { getAdminClient } from "./supabase";

export type EntitlementRow = {
  id: string;
  user_id: string;
  kind: "subscription" | "movie";
  movie_id: string | null;
  plan_id: string | null;
  expires_at: string | null;
  note: string | null;
  created_at: string;
};

/** Verifies a Supabase access token sent from the browser. */
export async function userIdFromToken(
  token: string | undefined | null,
): Promise<string | null> {
  if (!token) return null;
  const admin = getAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : (data.user?.id ?? null);
}

export function isActive(e: Pick<EntitlementRow, "expires_at">): boolean {
  return !e.expires_at || new Date(e.expires_at).getTime() > Date.now();
}

export async function listEntitlements(userId: string): Promise<EntitlementRow[]> {
  const admin = getAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("entitlements")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return error ? [] : (data as EntitlementRow[]);
}

export type Access = {
  /** End of the active subscription (ISO), "forever", or null. */
  subscriptionUntil: string | null;
  /** The user owns this particular movie/series. */
  ownsMovie: boolean;
};

export async function accessFor(userId: string, movieId: string): Promise<Access> {
  const active = (await listEntitlements(userId)).filter(isActive);
  const subs = active.filter((e) => e.kind === "subscription");
  const subscriptionUntil = subs.length
    ? subs.some((s) => !s.expires_at)
      ? "forever"
      : subs.map((s) => s.expires_at!).sort().at(-1)!
    : null;
  return {
    subscriptionUntil,
    ownsMovie: active.some((e) => e.kind === "movie" && e.movie_id === movieId),
  };
}

export function canWatch(a: Access): boolean {
  return Boolean(a.subscriptionUntil) || a.ownsMovie;
}

/** Best-effort play counter for the admin dashboard. */
export async function logPlay(movieId: string, episode: number, userId: string | null) {
  await getAdminClient()
    ?.from("play_events")
    .insert({ movie_id: movieId, episode, user_id: userId })
    .then(() => {}, () => {});
}
