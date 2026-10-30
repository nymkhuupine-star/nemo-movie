"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";
import { addCaption, createVideo, deleteVideo, playerUrl, signUpload } from "@/lib/bunny";
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

// Production builds hide messages of thrown errors, so these actions return
// { ok: false, error } for the admin UI to show instead of throwing.
type Fail = { ok: false; error: string };
const fail = (e: unknown): Fail => ({
  ok: false,
  error: e instanceof Error ? e.message : "Алдаа гарлаа.",
});

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
  try {
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
    return { ok: true as const, ...signUpload(videoId), title };
  } catch (e) {
    return fail(e);
  }
}

/** Links an uploaded Bunny video to the movie/episode, replacing any old one. */
export async function finishVideoUpload(
  movieId: string,
  episode: number,
  videoId: string,
): Promise<{ ok: true } | Fail> {
  try {
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
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Upload failed or was cancelled: drop the empty Bunny video object. */
export async function abortVideoUpload(videoId: string) {
  try {
    await requireAdmin();
    await deleteVideo(videoId);
  } catch {
    // Best effort.
  }
}

export async function removeVideo(
  movieId: string,
  episode: number,
): Promise<{ ok: true } | Fail> {
  try {
    await requireAdmin();
    const videoId = await findVideoId(movieId, episode);
    if (!videoId) return { ok: true };
    await deleteVideo(videoId).catch(() => {});
    const { error } = await db()
      .from("videos")
      .delete()
      .eq("movie_id", movieId)
      .eq("episode", episode);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Uploads a .srt/.vtt file as the Mongolian subtitle track of one episode. */
export async function uploadCaption(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch (e) {
    return fail(e);
  }
  const movieId = String(formData.get("movieId") ?? "");
  const episode = Number(formData.get("episode") || 1);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Файл сонгоно уу." };
  if (!/\.(srt|vtt)$/i.test(file.name)) return { ok: false, error: ".srt эсвэл .vtt файл байх ёстой." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Хадмалын файл хэт том байна." };

  const videoId = await findVideoId(movieId, episode);
  if (!videoId) return { ok: false, error: "Эхлээд бичлэгээ оруулна уу." };
  try {
    await addCaption(videoId, "mn", "Монгол", await file.text());
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Алдаа гарлаа." };
  }
}

/** Signed player link for the editor preview (first episode / the movie). */
export async function getEditorPreview(movieId: string): Promise<string | null> {
  try {
    await requireAdmin();
    const videoId = await findVideoId(movieId, 1);
    return videoId ? playerUrl(videoId, 60 * 60, undefined, false) : null;
  } catch {
    return null;
  }
}
