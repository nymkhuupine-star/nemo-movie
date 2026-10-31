// Server-only: QPay merchant API v2.
const BASE = "https://merchant.qpay.mn/v2";

export type QpayLink = {
  name: string;
  description: string;
  logo: string;
  link: string;
};

export type QpayInvoice = {
  invoiceId: string;
  qrImage: string;
  shortUrl: string;
  urls: QpayLink[];
};

let cached: { token: string; until: number } | null = null;

export function qpayConfigured(): boolean {
  return Boolean(
    process.env.QPAY_CLIENT_ID &&
      process.env.QPAY_CLIENT_SECRET &&
      process.env.QPAY_INVOICE_CODE,
  );
}

async function accessToken(): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.token;
  const basic = Buffer.from(
    `${process.env.QPAY_CLIENT_ID}:${process.env.QPAY_CLIENT_SECRET}`,
  ).toString("base64");
  const res = await fetch(`${BASE}/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`QPay auth failed: ${res.status}`);
  // expires_in is an absolute unix time here, not a number of seconds.
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, until: data.expires_in * 1000 - 60_000 };
  return data.access_token;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) cached = null;
    throw new Error(`QPay ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function createInvoice(input: {
  ref: string;
  description: string;
  amount: number;
  callbackUrl: string;
}): Promise<QpayInvoice> {
  const data = await post<{
    invoice_id: string;
    qr_image: string;
    qPay_shortUrl: string;
    urls: QpayLink[];
  }>("/invoice", {
    invoice_code: process.env.QPAY_INVOICE_CODE,
    sender_invoice_no: input.ref,
    invoice_receiver_code: "terminal",
    invoice_description: input.description,
    amount: input.amount,
    callback_url: input.callbackUrl,
  });
  return {
    invoiceId: data.invoice_id,
    qrImage: data.qr_image,
    shortUrl: data.qPay_shortUrl,
    urls: data.urls ?? [],
  };
}

/** The confirmed payment on an invoice, once the full amount has been paid. */
export async function findPaidPayment(
  invoiceId: string,
  amount: number,
): Promise<string | null> {
  const data = await post<{
    rows?: { payment_id: string; payment_status: string; payment_amount: string | number }[];
  }>("/payment/check", {
    object_type: "INVOICE",
    object_id: invoiceId,
    offset: { page_number: 1, page_limit: 100 },
  });
  const paid = (data.rows ?? []).filter((r) => r.payment_status === "PAID");
  const total = paid.reduce((sum, r) => sum + Number(r.payment_amount), 0);
  return paid.length && total >= amount ? String(paid[0].payment_id) : null;
}
