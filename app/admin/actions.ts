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
import { MOVIES_TAG } from "@/lib/data";
import { GENRES, SAMPLE_MOVIES } from "@/lib/movies";
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

export async function saveMovie(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const genre = String(formData.get("genre") ?? "");
  const kind = String(formData.get("kind") ?? "movie");

  if (!title) return { error: "Нэр оруулна уу." };
  if (!GENRES.some((g) => g.slug === genre)) return { error: "Төрөл сонгоно уу." };

  const rating = num(formData.get("rating")) ?? 0;
  if (rating < 0 || rating > 10) return { error: "Үнэлгээ 0-10 хооронд байна." };

  const row = {
    title,
    genre,
    year: num(formData.get("year")) ?? new Date().getFullYear(),
    rating,
    price: num(formData.get("price")) ?? 0,
    duration: kind === "movie" ? num(formData.get("duration")) : null,
    episodes: kind === "series" ? num(formData.get("episodes")) : null,
    is_new: formData.get("is_new") === "on",
    featured: formData.get("featured") === "on",
    trending: formData.get("trending") === "on",
    description: String(formData.get("description") ?? "").trim(),
    video_url: String(formData.get("video_url") ?? "").trim() || null,
    hue: num(formData.get("hue")) ?? 280,
  } as Record<string, unknown>;

  let savedId: string;
  try {
    const poster = formData.get("poster");
    if (poster instanceof File && poster.size > 0) {
      row.poster_url = await uploadPoster(poster);
    } else if (formData.get("remove_poster") === "on") {
      row.poster_url = null;
    }

    const client = db();
    const { data, error } = id
      ? await client.from("movies").update(row).eq("id", id).select("id").single()
      : await client.from("movies").insert(row).select("id").single();
    if (error) return { error: explain(error.message) };
    savedId = (data as { id: string }).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Алдаа гарлаа." };
  }

  updateTag(MOVIES_TAG);
  // Back to the edit page so videos can be uploaded right away.
  redirect(`/admin/movies/${savedId}?saved=1`);
}

export async function deleteMovie(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteBunnyVideosForMovie(id);
  const { error } = await db().from("movies").delete().eq("id", id);
  if (error) throw new Error(explain(error.message));
  updateTag(MOVIES_TAG);
  redirect("/admin?deleted=1");
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
  redirect("/admin?seeded=1");
}

function explain(message: string): string {
  if (/relation .*movies.* does not exist|Could not find the table/i.test(message)) {
    return "movies хүснэгт алга. Supabase SQL Editor дээр supabase/schema.sql-ийг ажиллуулна уу.";
  }
  return message;
}
