"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";
import { createVideo, deleteVideo, signUpload } from "@/lib/bunny";
import { getAdminClient } from "@/lib/supabase";
import { findVideoId } from "@/lib/videos";

async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionToken(token))) throw new Error("Нэвтрээгүй байна.");
}

function db() {
  const client = getAdminClient();
  if (!client) throw new Error("Supabase тохируулаагүй байна.");
  return client;
}

function checkEpisode(episode: number) {
  if (!Number.isInteger(episode) || episode < 1 || episode > 1000) {
    throw new Error("Ангийн дугаар буруу.");
  }
}

/**
 * Creates the Bunny video object and returns a short-lived signature so the
 * browser can upload the file straight to Bunny (no size limit on our side).
 */
export async function startVideoUpload(movieId: string, episode: number) {
  await requireAdmin();
  checkEpisode(episode);
  const { data: movie } = await db()
    .from("movies")
    .select("title, episodes")
    .eq("id", movieId)
    .maybeSingle();
  if (!movie) throw new Error("Кино олдсонгүй.");

  const title = movie.episodes
    ? `${movie.title} — ${episode}-р анги`
    : movie.title;
  const videoId = await createVideo(title);
  return { ...signUpload(videoId), title };
}

/** Links an uploaded Bunny video to the movie/episode, replacing any old one. */
export async function finishVideoUpload(
  movieId: string,
  episode: number,
  videoId: string,
) {
  await requireAdmin();
  checkEpisode(episode);
  const previous = await findVideoId(movieId, episode);
  const { error } = await db()
    .from("videos")
    .upsert(
      { movie_id: movieId, episode, bunny_video_id: videoId },
      { onConflict: "movie_id,episode" },
    );
  if (error) throw new Error(error.message);
  if (previous && previous !== videoId) {
    await deleteVideo(previous).catch(() => {});
  }
}

/** Upload failed or was cancelled: drop the empty Bunny video object. */
export async function abortVideoUpload(videoId: string) {
  await requireAdmin();
  await deleteVideo(videoId).catch(() => {});
}

export async function removeVideo(movieId: string, episode: number) {
  await requireAdmin();
  const videoId = await findVideoId(movieId, episode);
  if (!videoId) return;
  await deleteVideo(videoId).catch(() => {});
  const { error } = await db()
    .from("videos")
    .delete()
    .eq("movie_id", movieId)
    .eq("episode", episode);
  if (error) throw new Error(error.message);
}
