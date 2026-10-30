"use client";

import { Upload } from "tus-js-client";
import {
  abortVideoUpload,
  finishVideoUpload,
  startVideoUpload,
} from "@/app/admin/video-actions";

export type UploadHandle = { abort: () => void };

/**
 * Uploads one episode's video straight from the browser to Bunny (TUS,
 * resumable), then links it to the movie. Throws on failure or abort.
 */
export async function uploadEpisodeVideo(
  movieId: string,
  episode: number,
  file: File,
  onProgress: (percent: number) => void,
  onHandle?: (h: UploadHandle) => void,
): Promise<void> {
  const s = await startVideoUpload(movieId, episode);
  if (!s.ok) throw new Error(s.error);
  let aborted = false;
  try {
    await new Promise<void>((resolve, reject) => {
      const up = new Upload(file, {
        endpoint: s.endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        chunkSize: 50 * 1024 * 1024,
        headers: {
          AuthorizationSignature: s.signature,
          AuthorizationExpire: String(s.expire),
          VideoId: s.videoId,
          LibraryId: String(s.libraryId),
        },
        metadata: { filetype: file.type || "video/mp4", title: s.title },
        onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
        onError: reject,
        onSuccess: () => resolve(),
      });
      onHandle?.({
        abort: () => {
          aborted = true;
          up.abort(true);
          reject(new Error("Upload цуцлагдлаа."));
        },
      });
      up.start();
    });
    const done = await finishVideoUpload(movieId, episode, s.videoId);
    if (!done.ok) throw new Error(done.error);
  } catch (e) {
    await abortVideoUpload(s.videoId).catch(() => {});
    throw aborted ? new Error("Upload цуцлагдлаа.") : e;
  }
}
