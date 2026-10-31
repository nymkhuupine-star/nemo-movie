// Server-only: Meta Conversions API. Sends the events that matter for ads from the server, so
// Meta learns about every sale even when the browser blocked the Pixel or the buyer closed the
// tab before QPay's callback came. The Pixel sends the same events with the same event id, and
// Meta counts each one once.
//
// Env: NEXT_PUBLIC_META_PIXEL_ID, META_CAPI_ACCESS_TOKEN (Events Manager → Settings →
// Conversions API → Generate access token), optionally META_TEST_EVENT_CODE (Events Manager →
// Test events) while checking the setup. Off until both of the first two are set.
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";

const GRAPH_URL = "https://graph.facebook.com/v23.0";

function metaConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID && process.env.META_CAPI_ACCESS_TOKEN);
}

/**
 * What the buyer's browser tells Meta who they are. Kept with the payment, because the
 * purchase event may come from QPay's callback instead of their browser.
 */
export type MetaBrowser = {
  ip?: string;
  userAgent?: string;
  /** The _fbp / _fbc cookies the Pixel sets; _fbc ties the visit to the ad that was clicked. */
  fbp?: string;
  fbc?: string;
  url?: string;
};

/** Read from the current request, so call it before any deferred work. */
export async function metaBrowser(): Promise<MetaBrowser> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined,
    userAgent: h.get("user-agent") ?? undefined,
    fbp: c.get("_fbp")?.value,
    fbc: c.get("_fbc")?.value,
    url: h.get("referer") ?? undefined,
  };
}

const sha256 = (value: string) => createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

export type MetaEvent = {
  name: "CompleteRegistration" | "InitiateCheckout" | "Purchase";
  /** Shared with the Pixel's copy of the event, so Meta drops the duplicate. */
  eventId: string;
  user: { id: string; email?: string | null };
  browser?: MetaBrowser | null;
  custom?: { value?: number; currency?: string; contentIds?: string[]; contentName?: string };
};

/** Never throws: ads tracking must not break a sign-up or a payment. */
export async function sendMetaEvent(event: MetaEvent): Promise<void> {
  if (!metaConfigured()) return;
  const { browser, custom } = event;
  const data = {
    event_name: event.name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: event.eventId,
    action_source: "website",
    event_source_url: browser?.url,
    user_data: {
      em: event.user.email ? [sha256(event.user.email)] : undefined,
      external_id: [sha256(event.user.id)],
      client_ip_address: browser?.ip,
      client_user_agent: browser?.userAgent,
      fbp: browser?.fbp,
      fbc: browser?.fbc,
    },
    custom_data: custom && {
      value: custom.value,
      currency: custom.currency,
      content_ids: custom.contentIds,
      content_name: custom.contentName,
      content_type: custom.contentIds ? "product" : undefined,
    },
  };
  try {
    const res = await fetch(
      `${GRAPH_URL}/${process.env.NEXT_PUBLIC_META_PIXEL_ID}/events?access_token=${encodeURIComponent(process.env.META_CAPI_ACCESS_TOKEN!)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [data],
          ...(process.env.META_TEST_EVENT_CODE && { test_event_code: process.env.META_TEST_EVENT_CODE }),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) console.error(`[meta-capi] ${event.name} rejected (${res.status}):`, await res.text().catch(() => ""));
  } catch (err) {
    console.error(`[meta-capi] ${event.name} failed:`, err);
  }
}
