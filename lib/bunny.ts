// Bunny Stream helpers. Server-only: these use the library API key and the
// token authentication key, which must never reach the browser.
import { createHash } from "node:crypto";

const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
const apiKey = process.env.BUNNY_STREAM_API_KEY;
const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;

const API = "https://video.bunnycdn.com";
export const TUS_ENDPOINT = `${API}/tusupload`;

export function bunnyConfigured(): boolean {
  return Boolean(libraryId && apiKey);
}

function requireConfig() {
  if (!libraryId || !apiKey) {
    throw new Error(
      "Bunny Stream тохируулаагүй: .env.local-д BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY хэрэгтэй.",
    );
  }
  return { libraryId, apiKey };
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { libraryId, apiKey } = requireConfig();
  const res = await fetch(`${API}/library/${libraryId}${path}`, {
    ...init,
    headers: {
      AccessKey: apiKey,
      accept: "application/json",
      "content-type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Bunny API ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** Creates an empty video object; the file is then uploaded with TUS. */
export async function createVideo(title: string): Promise<string> {
  const v = await api<{ guid: string }>("/videos", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  return v.guid;
}

export async function deleteVideo(videoId: string): Promise<void> {
  await api(`/videos/${videoId}`, { method: "DELETE" });
}

export const VIDEO_STATUS: Record<number, string> = {
  0: "Үүссэн",
  1: "Upload хийгдсэн",
  2: "Боловсруулж байна",
  3: "Encode хийж байна",
  4: "Бэлэн",
  5: "Алдаа",
  6: "Upload алдаа",
};

export type VideoInfo = {
  status: number;
  encodeProgress: number;
  length: number;
  width: number;
  height: number;
};

export async function getVideo(videoId: string): Promise<VideoInfo> {
  return api<VideoInfo>(`/videos/${videoId}`);
}

/** Width ÷ height of a video; undefined until Bunny has measured it or if it can't be asked. */
export async function videoAspect(videoId: string): Promise<number | undefined> {
  try {
    const { width, height } = await getVideo(videoId);
    return width && height ? width / height : undefined;
  } catch {
    return undefined;
  }
}

/** Adds (or replaces) a subtitle track; Bunny's player shows it as a CC option. */
export async function addCaption(
  videoId: string,
  srclang: string,
  label: string,
  fileText: string,
): Promise<void> {
  await api(`/videos/${videoId}/captions/${srclang}`, {
    method: "POST",
    body: JSON.stringify({
      srclang,
      label,
      captionsFile: Buffer.from(fileText, "utf8").toString("base64"),
    }),
  });
}

export async function getCaptions(videoId: string): Promise<{ srclang: string; label: string }[]> {
  const v = await api<{ captions?: { srclang: string; label: string }[] }>(`/videos/${videoId}`);
  return v.captions ?? [];
}

/** Signature for a direct browser → Bunny TUS upload of one video. */
export function signUpload(videoId: string, ttlSeconds = 60 * 60 * 48) {
  const { libraryId, apiKey } = requireConfig();
  const expire = Math.floor(Date.now() / 1000) + ttlSeconds;
  return {
    endpoint: TUS_ENDPOINT,
    libraryId,
    videoId,
    expire,
    signature: sha256(libraryId + apiKey + expire + videoId),
  };
}

/**
 * Player URL for a video. When BUNNY_STREAM_TOKEN_KEY is set (enable "Embed
 * view token authentication" in the library's Security tab) the link is
 * signed and stops working after `ttlSeconds`.
 */
export function playerUrl(
  videoId: string,
  ttlSeconds = 60 * 60 * 4,
  startSec?: number,
  autoplay = true,
): string {
  const { libraryId } = requireConfig();
  const url = new URL(`https://player.mediadelivery.net/embed/${libraryId}/${videoId}`);
  url.searchParams.set("autoplay", String(autoplay));
  url.searchParams.set("preload", "true");
  if (startSec) url.searchParams.set("t", String(Math.floor(startSec)));
  if (tokenKey) {
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    url.searchParams.set("token", sha256(tokenKey + videoId + expires));
    url.searchParams.set("expires", String(expires));
  }
  return url.toString();
}
