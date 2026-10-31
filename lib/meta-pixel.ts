// Meta Pixel in the browser: page views and the ad events (view, registration, checkout,
// purchase), so ads can optimise for people who actually buy. The server sends registration,
// checkout and purchase too (lib/meta-capi.ts) with the same event ids; Meta keeps one.
// Off unless NEXT_PUBLIC_META_PIXEL_ID is set.

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[][] };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Meta's standard loader: a stub that queues calls until fbevents.js has loaded. */
function ensurePixel(): Fbq | null {
  if (!PIXEL_ID || typeof window === "undefined") return null;
  if (window.fbq) return window.fbq;
  const fbq: Fbq = (...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  };
  Object.assign(fbq, { push: fbq, loaded: true, version: "2.0", queue: [] });
  window.fbq = fbq;
  window._fbq ??= fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", PIXEL_ID);
  return fbq;
}

/**
 * Only the arguments given are passed on: Meta reads a bare fbq("track", "PageView"), as its
 * own snippet sends it, as the standard event.
 */
export function trackMeta(event: string, params?: Record<string, unknown>, eventId?: string) {
  const fbq = ensurePixel();
  if (!fbq) return;
  if (eventId) fbq("track", event, params ?? {}, { eventID: eventId });
  else if (params) fbq("track", event, params);
  else fbq("track", event);
}
