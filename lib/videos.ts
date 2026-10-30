// Server-only access to the private `videos` table (Bunny video ids).
import { bunnyConfigured, deleteVideo, getVideo, VIDEO_STATUS } from "./bunny";
import { getAdminClient } from "./supabase";

export type VideoRow = { episode: number; bunny_video_id: string };

export type VideoSlot = {
  episode: number;
  hasVideo: boolean;
  status?: number;
  statusLabel?: string;
  progress?: number;
};

export async function listVideoRows(movieId: string): Promise<VideoRow[]> {
  const client = getAdminClient();
  if (!client) return [];
  const { data, error } = await client
    .from("videos")
    .select("episode, bunny_video_id")
    .eq("movie_id", movieId)
    .order("episode");
  if (error) return [];
  return data as VideoRow[];
}

export async function findVideoId(
  movieId: string,
  episode: number,
): Promise<string | undefined> {
  const client = getAdminClient();
  if (!client) return undefined;
  const { data } = await client
    .from("videos")
    .select("bunny_video_id")
    .eq("movie_id", movieId)
    .eq("episode", episode)
    .maybeSingle();
  return (data as { bunny_video_id: string } | null)?.bunny_video_id;
}

/** Upload slots for the admin page with live Bunny encoding status. */
export async function videoSlots(
  movieId: string,
  count: number,
): Promise<VideoSlot[]> {
  const rows = await listVideoRows(movieId);
  const byEpisode = new Map(rows.map((r) => [r.episode, r.bunny_video_id]));
  return Promise.all(
    Array.from({ length: count }, async (_, i): Promise<VideoSlot> => {
      const episode = i + 1;
      const videoId = byEpisode.get(episode);
      if (!videoId) return { episode, hasVideo: false };
      if (!bunnyConfigured()) return { episode, hasVideo: true };
      try {
        const v = await getVideo(videoId);
        return {
          episode,
          hasVideo: true,
          status: v.status,
          statusLabel: VIDEO_STATUS[v.status] ?? `Төлөв ${v.status}`,
          progress: v.encodeProgress,
        };
      } catch {
        return { episode, hasVideo: true, statusLabel: "Bunny-д олдсонгүй" };
      }
    }),
  );
}

/** Best-effort cleanup of a movie's Bunny videos (rows cascade in the DB). */
export async function deleteBunnyVideosForMovie(movieId: string) {
  if (!bunnyConfigured()) return;
  const rows = await listVideoRows(movieId);
  await Promise.allSettled(rows.map((r) => deleteVideo(r.bunny_video_id)));
}
