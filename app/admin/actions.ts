"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  checkPassword,
  createSessionToken,
  verifySessionToken,
} from "@/lib/admin-session";
import { MOVIES_TAG, getGenres } from "@/lib/data";
import { SAMPLE_MOVIES, type VideoEdit } from "@/lib/movies";
import { POSTER_BUCKET, getAdminClient } from "@/lib/supabase";
import { deleteBunnyVideosForMovie } from "@/lib/videos";

export type FormState = { error?: string; ok?: string };

async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionToken(token))) redirect("/admin/login");
}

function db() {
  const client = getAdminClient();
  if (!client) {
    throw new Error(
      "Supabase тохируулаагүй байна: NEXT_PUBLIC_SUPABASE_URL болон SUPABASE_SERVICE_ROLE_KEY хэрэгтэй.",
    );
  }
  return client;
}

/* ---------- auth ---------- */

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!process.env.ADMIN_PASSWORD) {
    return { error: ".env.local дотор ADMIN_PASSWORD тохируулаагүй байна." };
  }
  const password = String(formData.get("password") ?? "");
  if (!(await checkPassword(password))) {
    // Slow down guessing a little.
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Нууц үг буруу байна." };
  }
  (await cookies()).set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/* ---------- movies ---------- */

function num(v: FormDataEntryValue | null): number | null {
  if (v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function ensureBucket() {
  const client = db();
  const { data } = await client.storage.getBucket(POSTER_BUCKET);
  if (!data) {
    await client.storage.createBucket(POSTER_BUCKET, { public: true });
  }
}

async function uploadPoster(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Постер зураг байх ёстой.");
  await ensureBucket();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const client = db();
  const { error } = await client.storage
    .from(POSTER_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Постер upload алдаа: ${error.message}`);
  return client.storage.from(POSTER_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** "2ц 15м", "1:28", "88" → minutes. */
function parseDuration(v: FormDataEntryValue | null): number | null {
  const t = String(v ?? "").trim().toLowerCase();
  if (!t) return null;
  const hm = t.match(/(?:(\d+)\s*ц)?\s*(?:(\d+)\s*м)?/);
  if (hm && (hm[1] || hm[2])) return Number(hm[1] ?? 0) * 60 + Number(hm[2] ?? 0);
  const colon = t.match(/^(\d+):(\d{1,2})$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function parseEdit(raw: FormDataEntryValue | null): VideoEdit {
  try {
    const e = JSON.parse(String(raw ?? "{}")) as VideoEdit;
    const pct = (n: unknown) => Math.min(100, Math.max(0, Number(n) || 0));
    return {
      logoUrl: typeof e.logoUrl === "string" && e.logoUrl ? e.logoUrl : undefined,
      logoPos: ["tl", "tr", "bl", "br"].includes(e.logoPos ?? "") ? e.logoPos : "tr",
      logoSize: Math.min(60, Math.max(3, Number(e.logoSize) || 12)),
      logoX: e.logoX === undefined ? undefined : pct(e.logoX),
      logoY: e.logoY === undefined ? undefined : pct(e.logoY),
      blurs: (e.blurs ?? []).slice(0, 6).map((b) => ({
        x: pct(b.x), y: pct(b.y), w: pct(b.w), h: pct(b.h),
      })),
      startSec: Math.max(0, Number(e.startSec) || 0) || undefined,
      endSec: Math.max(0, Number(e.endSec) || 0) || undefined,
      vertical: e.vertical === true ? true : undefined,
    };
  } catch {
    return {};
  }
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Creates or updates a movie from the admin editor. Returns the id instead of
 * redirecting so the editor can go on to upload the video and subtitles.
 */
export async function saveMovieData(formData: FormData): Promise<SaveResult> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const genre = String(formData.get("genre") ?? "");
  const kind = String(formData.get("kind") ?? "movie");

  if (!title) return { ok: false, error: "Нэр оруулна уу." };
  if (!(await getGenres()).some((g) => g.slug === genre)) {
    return { ok: false, error: "Төрөл сонгоно уу." };
  }
  const rating = num(formData.get("rating")) ?? 0;
  if (rating < 0 || rating > 10) return { ok: false, error: "Үнэлгээ 0-10 хооронд байна." };
  const episodes = kind === "series" ? num(formData.get("episodes")) : null;
  if (kind === "series" && (!episodes || episodes < 1)) {
    return { ok: false, error: "Ангийн тоог оруулна уу." };
  }

  const edit = parseEdit(formData.get("edit"));
  const row: Record<string, unknown> = {
    title,
    genre,
    year: num(formData.get("year")) ?? new Date().getFullYear(),
    rating,
    price: num(formData.get("price")) ?? 0,
    duration: kind === "movie" ? parseDuration(formData.get("duration")) : null,
    episodes,
    is_new: formData.get("is_new") === "on",
    featured: formData.get("featured") === "on",
    trending: formData.get("trending") === "on",
    is_hidden: formData.get("active") !== "on",
    description: String(formData.get("description") ?? "").trim(),
    hue: num(formData.get("hue")) ?? 280,
  };

  try {
    const poster = formData.get("poster");
    if (poster instanceof File && poster.size > 0) row.poster_url = await uploadPoster(poster);
    else if (formData.get("remove_poster") === "on") row.poster_url = null;

    const backdrop = formData.get("backdrop");
    if (backdrop instanceof File && backdrop.size > 0) row.backdrop_url = await uploadPoster(backdrop);
    else if (formData.get("remove_backdrop") === "on") row.backdrop_url = null;

    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) edit.logoUrl = await uploadPoster(logo);
    row.edit = edit;

    const client = db();
    const { data, error } = id
      ? await client.from("movies").update(row).eq("id", id).select("id").single()
      : await client.from("movies").insert(row).select("id").single();
    if (error) return { ok: false, error: explain(error.message) };
    updateTag(MOVIES_TAG);
    return { ok: true, id: (data as { id: string }).id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Алдаа гарлаа." };
  }
}

export async function deleteMovie(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteBunnyVideosForMovie(id);
  const { error } = await db().from("movies").delete().eq("id", id);
  if (error) throw new Error(explain(error.message));
  updateTag(MOVIES_TAG);
  redirect("/admin/movies?deleted=1");
}

/** Copies the sample catalogue into an empty movies table. */
export async function seedSampleMovies() {
  await requireAdmin();
  const now = Date.now();
  const rows = SAMPLE_MOVIES.map((m, i) => ({
    title: m.title,
    genre: m.genre,
    year: m.year,
    rating: m.rating,
    price: m.price,
    duration: m.duration ?? null,
    episodes: m.episodes ?? null,
    is_new: Boolean(m.isNew),
    featured: Boolean(m.featured),
    trending: Boolean(m.trending),
    description: m.description,
    hue: m.hue,
    // Keep the sample order when sorting newest first.
    created_at: new Date(now - i * 1000).toISOString(),
  }));
  const { error } = await db().from("movies").insert(rows);
  if (error) throw new Error(explain(error.message));
  updateTag(MOVIES_TAG);
  redirect("/admin/movies?seeded=1");
}

function explain(message: string): string {
  if (/(is_hidden|backdrop_url|edit|trend_order).*(column|schema cache)|column .*(is_hidden|backdrop_url|edit)/i.test(message)) {
    return "Supabase дээр supabase/admin3.sql-ийг ажиллуулна уу (шинэ баганууд дутуу).";
  }
  if (/relation .*movies.* does not exist|Could not find the table/i.test(message)) {
    return "movies хүснэгт алга. Supabase SQL Editor дээр supabase/schema.sql-ийг ажиллуулна уу.";
  }
  return message;
}
