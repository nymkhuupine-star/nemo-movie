import type { NextRequest } from "next/server";
import { getPayment, settleQpay } from "@/lib/payments";

// QPay's notification after payment. Anyone can call this address, so it only
// prompts us to ask QPay directly; the request itself proves nothing.
async function handle(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  try {
    const payment = id ? await getPayment(id) : null;
    if (payment) await settleQpay(payment);
  } catch (err) {
    console.error("qpay callback failed:", err);
  }
  return new Response("SUCCESS");
}

export const GET = handle;
export const POST = handle;
