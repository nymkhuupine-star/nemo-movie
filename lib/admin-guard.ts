import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "./admin-session";

/** Page-level check, on top of proxy.ts, before any admin data is read. */
export async function assertAdmin() {
  // Session expiry reads the clock, so this must run per request.
  await connection();
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionToken(token))) redirect("/admin/login");
}
