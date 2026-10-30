"use server";

import { bunnyConfigured, playerUrl } from "@/lib/bunny";
import { getMovie } from "@/lib/data";
import { FREE_EPISODES } from "@/lib/movies";
import { getAdminClient } from "@/lib/supabase";
import { findVideoId } from "@/lib/videos";

export type PlayResult =
  | { ok: true; kind: "embed" | "file"; url: string }
  | { ok: false; error: string; locked?: boolean };

/**
 * Returns a playback link for one episode (movies use episode 1). Access is
 * decided here on the server: until payments exist, only a series' first
 * FREE_EPISODES episodes are playable.
 */
export async function getPlayback(
  movieId: string,
  episode: number,
): Promise<PlayResult> {
  const movie = await getMovie(movieId);
  if (!movie) return { ok: false, error: "Кино олдсонгүй." };

  const isSeries = Boolean(movie.episodes);
  if (isSeries && (episode < 1 || episode > (movie.episodes ?? 0))) {
    return { ok: false, error: "Анги олдсонгүй." };
  }
  // TODO: allow paid content once purchases/subscriptions are implemented.
  const free = isSeries && episode <= FREE_EPISODES;
  if (!free) {
    return {
      ok: false,
      locked: true,
      error: isSeries
        ? `${episode}-р ангийг үзэхийн тулд худалдаж авна уу.`
        : "Энэ киног үзэхийн тулд худалдаж авна уу.",
    };
  }

  if (bunnyConfigured()) {
    const videoId = await findVideoId(movieId, episode);
    if (videoId) return { ok: true, kind: "embed", url: playerUrl(videoId) };
  }

  // Fallback: a plain video URL set in the admin form.
  const { data } = (await getAdminClient()
    ?.from("movies")
    .select("video_url")
    .eq("id", movieId)
    .maybeSingle()) ?? { data: null };
  const fileUrl = (data as { video_url: string | null } | null)?.video_url;
  if (fileUrl) return { ok: true, kind: "file", url: fileUrl };

  return { ok: false, error: "Энэ ангийн видео хараахан нэмэгдээгүй байна." };
}
