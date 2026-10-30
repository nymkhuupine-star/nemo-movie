"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";
import { GENRES_TAG, MOVIES_TAG, PLANS_TAG } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase";

async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionToken(token))) redirect("/admin/login");
}

function db() {
  const client = getAdminClient();
  if (!client) throw new Error("Supabase тохируулаагүй байна.");
  return client;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => Math.round(Number(f.get(k) || 0));

/* ---------- plans ---------- */

export async function savePlan(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const row = {
    name: str(formData, "name"),
    description: str(formData, "description"),
    price: int(formData, "price"),
    days: int(formData, "days"),
    badge: str(formData, "badge") || null,
    sort: int(formData, "sort"),
    active: formData.get("active") === "on",
  };
  if (!row.name || row.price < 0 || row.days < 1) redirect("/admin/plans?notice=invalid");

  const { error } = id
    ? await db().from("plans").update(row).eq("id", id)
    : await db().from("plans").insert(row);
  updateTag(PLANS_TAG);
  redirect(`/admin/plans?notice=${error ? "error" : "saved"}`);
}

export async function deletePlan(formData: FormData) {
  await requireAdmin();
  const { error } = await db().from("plans").delete().eq("id", str(formData, "id"));
  updateTag(PLANS_TAG);
  redirect(`/admin/plans?notice=${error ? "error" : "deleted"}`);
}

/* ---------- genres ---------- */

export async function saveGenre(formData: FormData) {
  await requireAdmin();
  const isNew = formData.get("isNew") === "1";
  const slug = str(formData, "slug").toLowerCase();
  const name = str(formData, "name");
  const sort = int(formData, "sort");
  if (!name || !/^[a-z0-9-]+$/.test(slug)) redirect("/admin/genres?notice=invalid");

  const { error } = isNew
    ? await db().from("genres").insert({ slug, name, sort })
    : await db().from("genres").update({ name, sort }).eq("slug", slug);
  updateTag(GENRES_TAG);
  redirect(`/admin/genres?notice=${error ? (isNew ? "exists" : "error") : "saved"}`);
}

export async function deleteGenre(formData: FormData) {
  await requireAdmin();
  const slug = str(formData, "slug");
  const { count } = await db()
    .from("movies")
    .select("id", { count: "exact", head: true })
    .eq("genre", slug);
  if (count) redirect("/admin/genres?notice=in-use");

  const { error } = await db().from("genres").delete().eq("slug", slug);
  updateTag(GENRES_TAG);
  redirect(`/admin/genres?notice=${error ? "error" : "deleted"}`);
}

/* ---------- visibility ---------- */

/** Shows or hides a movie on the site (the "Сайт дээр" switch). */
export async function setMovieHidden(
  movieId: string,
  hidden: boolean,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const { error } = await db()
    .from("movies")
    .update({ is_hidden: hidden })
    .eq("id", movieId);
  if (error) {
    return {
      ok: false,
      error: error.message.includes("is_hidden")
        ? "Supabase дээр supabase/admin2.sql-ийг ажиллуулна уу."
        : error.message,
    };
  }
  updateTag(MOVIES_TAG);
  return { ok: true };
}

/* ---------- featured / trending order ---------- */

// "featured" = home hero; "trending" = the trending row.
const ORDER = {
  featured: { flag: "featured", column: "hero_order" },
  trending: { flag: "trending", column: "trend_order" },
} as const;
type OrderKind = keyof typeof ORDER;

function orderKind(formData: FormData): OrderKind {
  return str(formData, "kind") === "trending" ? "trending" : "featured";
}

async function orderedIds(kind: OrderKind): Promise<string[]> {
  const { flag, column } = ORDER[kind];
  const { data } = await db()
    .from("movies")
    .select("id, created_at")
    .eq(flag, true)
    .order(column, { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as { id: string }[]).map((m) => m.id);
}

async function writeOrder(kind: OrderKind, ids: string[]) {
  const { flag, column } = ORDER[kind];
  await Promise.all(
    ids.map((id, i) =>
      db().from("movies").update({ [flag]: true, [column]: i + 1 }).eq("id", id),
    ),
  );
}

export async function orderAdd(formData: FormData) {
  await requireAdmin();
  const kind = orderKind(formData);
  const id = str(formData, "movieId");
  if (id) await writeOrder(kind, [...(await orderedIds(kind)).filter((x) => x !== id), id]);
  updateTag(MOVIES_TAG);
  redirect(`/admin/order/${kind}`);
}

export async function orderRemove(formData: FormData) {
  await requireAdmin();
  const kind = orderKind(formData);
  const { flag, column } = ORDER[kind];
  const id = str(formData, "movieId");
  await db().from("movies").update({ [flag]: false, [column]: null }).eq("id", id);
  await writeOrder(kind, (await orderedIds(kind)).filter((x) => x !== id));
  updateTag(MOVIES_TAG);
  redirect(`/admin/order/${kind}`);
}

export async function orderMove(formData: FormData) {
  await requireAdmin();
  const kind = orderKind(formData);
  const id = str(formData, "movieId");
  const dir = str(formData, "dir") === "up" ? -1 : 1;
  const ids = await orderedIds(kind);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i >= 0 && j >= 0 && j < ids.length) {
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await writeOrder(kind, ids);
  }
  updateTag(MOVIES_TAG);
  redirect(`/admin/order/${kind}`);
}
