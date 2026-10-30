"use client";

import { Upload } from "tus-js-client";
import {
  abortVideoUpload,
  finishVideoUpload,
  startVideoUpload,
} from "@/app/admin/video-actions";

/**
 * `abort` is the admin cancelling: the partial upload is thrown away.
 * `pause` stops sending but keeps it, so picking the same file resumes.
 */
export type UploadHandle = { abort: () => void; pause: () => void };

type Started = Extract<Awaited<ReturnType<typeof startVideoUpload>>, { ok: true }>;

/**
 * One unfinished upload per movie/episode, kept across page reloads.
 * `uploaded`: the file is on Bunny and only linking it to the movie is left.
 */
type Saved = { fileId: string; session: Started; uploaded?: boolean };

const savedKey = (movieId: string, episode: number) => `nemo-upload:${movieId}:${episode}`;

const fileIdOf = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

function readSaved(key: string): Saved | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function writeSaved(key: string, saved: Saved) {
  try {
    localStorage.setItem(key, JSON.stringify(saved));
  } catch {}
}

function clearSaved(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

// Long enough to ride out a dropped connection; the delay resets as soon as
// any data gets through.
const RETRY_DELAYS = [0, 3000, 5000, 10000, 20000, 30000, 60000, 60000, 60000, 60000];

const statusOf = (e: unknown) =>
  (e as { originalResponse?: { getStatus(): number } | null }).originalResponse?.getStatus();

/**
 * Bunny refused the upload outright (e.g. its video object is gone). 423 is not
 * a refusal: after a dropped connection the upload stays locked for a while.
 */
function isRejected(e: unknown) {
  const status = statusOf(e);
  return status !== undefined && status >= 400 && status < 500 && status !== 409 && status !== 423;
}

function errorText(e: unknown) {
  if (statusOf(e) === 423) return "Bunny өмнөх холболтыг хаахыг хүлээж байна. Хэдэн минутын дараа оролдоно уу.";
  return e instanceof Error ? e.message : "Upload амжилтгүй боллоо.";
}

class Cancelled extends Error {}
class Paused extends Error {}

function send(
  file: File,
  key: string,
  session: Started,
  onProgress: (percent: number) => void,
  onHandle?: (h: UploadHandle) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let stopped = false;
    const up = new Upload(file, {
      endpoint: session.endpoint,
      retryDelays: RETRY_DELAYS,
      chunkSize: 50 * 1024 * 1024,
      // tus gives up at once while the browser reports offline; keep waiting.
      onShouldRetry: (err) => !isRejected(err),
      // Ties the stored upload URL to this Bunny video, not just to the file.
      fingerprint: async () => `${key}:${session.videoId}:${fileIdOf(file)}`,
      removeFingerprintOnSuccess: true,
      headers: {
        AuthorizationSignature: session.signature,
        AuthorizationExpire: String(session.expire),
        VideoId: session.videoId,
        LibraryId: String(session.libraryId),
      },
      metadata: { filetype: file.type || "video/mp4", title: session.title },
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onError: reject,
      onSuccess: () => resolve(),
    });
    onHandle?.({
      abort: () => {
        stopped = true;
        void up.abort(true).catch(() => {});
        reject(new Cancelled("Upload цуцлагдлаа."));
      },
      pause: () => {
        stopped = true;
        void up.abort(false);
        reject(new Paused("Upload түр зогслоо."));
      },
    });
    up.findPreviousUploads()
      .then((previous) => {
        if (stopped) return;
        if (previous[0]) up.resumeFromPreviousUpload(previous[0]);
        up.start();
      })
      .catch(reject);
  });
}

/**
 * Uploads one episode's video straight from the browser to Bunny (TUS), then
 * links it to the movie. Throws on failure or abort. A failed or interrupted
 * upload stays on Bunny, so running this again with the same file continues
 * where it stopped, even after a page reload.
 */
export async function uploadEpisodeVideo(
  movieId: string,
  episode: number,
  file: File,
  onProgress: (percent: number) => void,
  onHandle?: (h: UploadHandle) => void,
): Promise<void> {
  const key = savedKey(movieId, episode);
  const fileId = fileIdOf(file);

  let saved = readSaved(key);
  if (saved && (saved.fileId !== fileId || saved.session.expire * 1000 < Date.now() + 60_000)) {
    // A different file now, or too late to continue: this one will never finish.
    void abortVideoUpload(saved.session.videoId);
    clearSaved(key);
    saved = null;
  }

  const begin = async () => {
    const s = await startVideoUpload(movieId, episode);
    if (!s.ok) throw new Error(s.error);
    writeSaved(key, { fileId, session: s });
    return s;
  };

  let session = saved?.session ?? (await begin());
  try {
    if (!saved?.uploaded) {
      try {
        await send(file, key, session, onProgress, onHandle);
      } catch (e) {
        if (!saved || !isRejected(e)) throw e;
        // The saved video can't be continued; start over with a new one.
        clearSaved(key);
        session = await begin();
        await send(file, key, session, onProgress, onHandle);
      }
      writeSaved(key, { fileId, session, uploaded: true });
    }
    const done = await finishVideoUpload(movieId, episode, session.videoId);
    if (!done.ok) throw new Error(done.error);
    clearSaved(key);
  } catch (e) {
    if (e instanceof Cancelled) {
      clearSaved(key);
      await abortVideoUpload(session.videoId).catch(() => {});
      throw e;
    }
    if (e instanceof Paused) throw e;
    throw new Error(
      `${errorText(e)} Ижил файлаар дахин оролдвол тасарсан газраасаа үргэлжилнэ.`,
    );
  }
}
