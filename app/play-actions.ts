"use server";

import { accessFor, canWatch, logPlay, userIdFromToken, type Access } from "@/lib/access";
import { bunnyConfigured, playerUrl, videoAspect } from "@/lib/bunny";
import { getMovie } from "@/lib/data";
import { settleUserPayments } from "@/lib/payments";
import { FREE_EPISODES, type VideoEdit } from "@/lib/movies";
import { getAdminClient } from "@/lib/supabase";
import { findVideoId } from "@/lib/videos";

export type PlayResult =
  | { ok: true; kind: "embed" | "file"; url: string; edit: VideoEdit; aspect?: number }
  | { ok: false; error: string; locked?: boolean };

/** What the signed-in user may watch for one movie (drives the lock icons). */
export async function getMyAccess(
  movieId: string,
  accessToken: string,
): Promise<Access | null> {
  const userId = await userIdFromToken(accessToken);
  if (!userId) return null;
  const access = await accessFor(userId, movieId);
  if (canWatch(access)) return access;
  // A payment may have landed after they closed the checkout dialog.
  await settleUserPayments(userId);
  return accessFor(userId, movieId);
}

/**
 * Returns a playback link for one episode (movies use episode 1). Access is
 * decided here on the server: a series' first FREE_EPISODES episodes are
 * free; everything else needs a subscription or a purchase of that title.
 */
export async function getPlayback(
  movieId: string,
  episode: number,
  accessToken?: string,
): Promise<PlayResult> {
  const movie = await getMovie(movieId);
  if (!movie) return { ok: false, error: "Кино олдсонгүй." };

  const isSeries = Boolean(movie.episodes);
  if (isSeries && (episode < 1 || episode > (movie.episodes ?? 0))) {
    return { ok: false, error: "Анги олдсонгүй." };
  }
  if (!isSeries) episode = 1;

  const userId = await userIdFromToken(accessToken);
  const free = isSeries && episode <= FREE_EPISODES;
  if (!free) {
    let allowed = userId ? canWatch(await accessFor(userId, movieId)) : false;
    if (!allowed && userId) {
      await settleUserPayments(userId);
      allowed = canWatch(await accessFor(userId, movieId));
    }
    if (!allowed) {
      return {
        ok: false,
        locked: true,
        error: isSeries
          ? `${episode}-р ангийг үзэхийн тулд худалдаж авах эсвэл гишүүнчлэл идэвхжүүлнэ үү.`
          : "Энэ киног үзэхийн тулд худалдаж авах эсвэл гишүүнчлэл идэвхжүүлнэ үү.",
      };
    }
  }

  // Overlays/trim set in the admin editor ("Видео засвар").
  const { data } = (await getAdminClient()
    ?.from("movies")
    .select("*")
    .eq("id", movieId)
    .maybeSingle()) ?? { data: null };
  const row = data as { video_url?: string | null; edit?: VideoEdit | null } | null;
  const edit = row?.edit ?? {};

  let result: PlayResult | null = null;
  if (bunnyConfigured()) {
    const videoId = await findVideoId(movieId, episode);
    if (videoId) {
      result = {
        ok: true,
        kind: "embed",
        url: playerUrl(videoId, undefined, edit.startSec),
        edit,
        aspect: await videoAspect(videoId),
      };
    }
  }
  if (!result && row?.video_url) {
    // Fallback: a plain video URL.
    result = { ok: true, kind: "file", url: row.video_url, edit };
  }
  if (!result) {
    return { ok: false, error: "Энэ ангийн видео хараахан нэмэгдээгүй байна." };
  }

  await logPlay(movieId, episode, userId);
  return result;
}
