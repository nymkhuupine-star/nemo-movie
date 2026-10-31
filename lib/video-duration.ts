const READ_TIMEOUT_MS = 15_000;

/** Seconds → whole minutes for `movies.duration`; anything shorter than a minute counts as one. */
export function secondsToMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

/**
 * Reads a picked file's length in the browser, in minutes. Null when the browser
 * can't tell (a format it doesn't play); the length then comes from Bunny later.
 */
export function readVideoMinutes(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (minutes: number | null) => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(minutes);
    };
    const timer = setTimeout(() => done(null), READ_TIMEOUT_MS);
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      // Some recordings report Infinity because their header has no length.
      done(Number.isFinite(video.duration) && video.duration > 0 ? secondsToMinutes(video.duration) : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}
