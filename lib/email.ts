// Transactional email through Resend's HTTP API. RESEND_API_KEY is set by the
// Vercel ↔ Resend integration (add it to .env.local for local dev).

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "Nemo Kino <noreply@nemokino.com>";

export function emailConfigured(): boolean {
  return Boolean(apiKey);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (!apiKey) throw new Error("RESEND_API_KEY тохируулаагүй байна.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, ...opts }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Simple dark email with one call-to-action button. */
export function actionEmail(opts: {
  heading: string;
  body: string;
  button: string;
  url: string;
  footnote: string;
}): { html: string; text: string } {
  const url = escapeHtml(opts.url);
  const html = `<!doctype html>
<html><body style="margin:0;background:#0b0b0b;font-family:Arial,Helvetica,sans-serif;color:#ffffff">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#141414;border:1px solid #262626;border-radius:16px;padding:32px">
        <tr><td style="font-size:26px;font-weight:900;letter-spacing:-1px">nemo<span style="color:#d8b4fe">●</span></td></tr>
        <tr><td style="padding-top:24px;font-size:20px;font-weight:bold">${escapeHtml(opts.heading)}</td></tr>
        <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#bdbdbd">${escapeHtml(opts.body)}</td></tr>
        <tr><td style="padding-top:28px">
          <a href="${url}" style="display:inline-block;background:#d8b4fe;color:#1a0b2e;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:999px">${escapeHtml(opts.button)}</a>
        </td></tr>
        <tr><td style="padding-top:28px;font-size:12px;line-height:1.6;color:#7a7a7a">${escapeHtml(opts.footnote)}</td></tr>
      </table>
      <p style="font-size:12px;color:#5c5c5c;margin-top:16px">© Nemo Kino · nemokino.com</p>
    </td></tr>
  </table>
</body></html>`;
  const text = `${opts.heading}\n\n${opts.body}\n\n${opts.button}: ${opts.url}\n\n${opts.footnote}`;
  return { html, text };
}
