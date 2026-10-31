import { syncAllPayments } from "@/lib/payments";

// Scheduled job: credits payments from people who closed the checkout dialog.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await syncAllPayments();
    return Response.json({ ok: true });
  } catch (err) {
    console.error("payment sync failed:", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
