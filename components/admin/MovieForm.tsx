"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import Poster from "@/components/Poster";
import { saveMovie, type FormState } from "@/app/admin/actions";
import { GENRES, type Movie } from "@/lib/movies";

const INPUT =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-accent/60";
const LABEL = "mb-2 block text-sm text-white/60";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}

export default function MovieForm({ movie }: { movie?: Movie }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveMovie,
    {},
  );
  const [kind, setKind] = useState<"movie" | "series">(
    movie?.episodes ? "series" : "movie",
  );
  const [title, setTitle] = useState(movie?.title ?? "");
  const [hue, setHue] = useState(movie?.hue ?? 280);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePoster, setRemovePoster] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const posterMovie: Movie = {
    id: movie?.id ?? "preview",
    title: title || "Киноны нэр",
    genre: movie?.genre ?? "action",
    year: 0,
    rating: 0,
    price: 0,
    description: "",
    hue,
    poster: removePoster ? undefined : (preview ?? movie?.poster),
  };

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_260px]">
      {movie && <input type="hidden" name="id" value={movie.id} />}

      <div className="space-y-5">
        <Field label="Нэр *">
          <input
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={INPUT}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Төрөл (жанр) *">
            <select
              name="genre"
              defaultValue={movie?.genre ?? ""}
              required
              className={INPUT}
            >
              <option value="" disabled>
                Сонгох…
              </option>
              {GENRES.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <span className={LABEL}>Хэлбэр</span>
            <div className="grid h-11 grid-cols-2 rounded-xl border border-line bg-surface-2 p-1">
              {(["movie", "series"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-lg text-sm font-medium ${
                    kind === k ? "btn-accent" : "text-white/60"
                  }`}
                >
                  {k === "movie" ? "Кино" : "Цуврал"}
                </button>
              ))}
            </div>
            <input type="hidden" name="kind" value={kind} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Он">
            <input
              name="year"
              type="number"
              min={1900}
              max={2100}
              defaultValue={movie?.year ?? new Date().getFullYear()}
              className={INPUT}
            />
          </Field>
          <Field label="Үнэлгээ (0-10)">
            <input
              name="rating"
              type="number"
              step="0.1"
              min={0}
              max={10}
              defaultValue={movie?.rating ?? 9}
              className={INPUT}
            />
          </Field>
          <Field label="Үнэ (₮)">
            <input
              name="price"
              type="number"
              min={0}
              step={100}
              defaultValue={movie?.price ?? 4900}
              className={INPUT}
            />
          </Field>
          {kind === "movie" ? (
            <Field label="Үргэлжлэх (мин)">
              <input
                name="duration"
                type="number"
                min={1}
                defaultValue={movie?.duration ?? ""}
                className={INPUT}
              />
            </Field>
          ) : (
            <Field label="Ангийн тоо">
              <input
                name="episodes"
                type="number"
                min={1}
                defaultValue={movie?.episodes ?? ""}
                className={INPUT}
              />
            </Field>
          )}
        </div>

        <Field label="Тайлбар">
          <textarea
            name="description"
            rows={4}
            defaultValue={movie?.description ?? ""}
            className={`${INPUT} h-auto py-3`}
          />
        </Field>

        <Field label="Видео URL (mp4 гэх мэт)">
          <input
            name="video_url"
            type="url"
            placeholder="https://…"
            defaultValue={movie?.videoUrl ?? ""}
            className={INPUT}
          />
        </Field>

        <div className="flex flex-wrap gap-5 text-sm">
          {[
            { name: "is_new", label: "Шинэ", checked: movie?.isNew },
            { name: "featured", label: "Онцлох (hero)", checked: movie?.featured },
            { name: "trending", label: "Тренд", checked: movie?.trending },
          ].map((f) => (
            <label key={f.name} className="flex items-center gap-2 text-white/80">
              <input
                type="checkbox"
                name={f.name}
                defaultChecked={f.checked}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              {f.label}
            </label>
          ))}
        </div>

        {state.error && (
          <p className="rounded-xl border border-hot/30 bg-hot/10 px-4 py-2.5 text-sm text-hot">
            {state.error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="btn-accent h-11 rounded-full px-7 text-sm font-semibold disabled:opacity-60"
          >
            {pending ? "Хадгалж байна…" : "Хадгалах"}
          </button>
          <Link
            href="/admin"
            className="flex h-11 items-center rounded-full border border-line px-6 text-sm text-white/70 hover:text-white"
          >
            Болих
          </Link>
        </div>
      </div>

      <aside className="space-y-4">
        <span className={LABEL}>Постер</span>
        <Poster
          movie={posterMovie}
          className="aspect-[2/3] w-full rounded-xl border border-line"
          sizes="260px"
        />
        <input
          type="file"
          name="poster"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
            setRemovePoster(false);
          }}
          className="block w-full text-xs text-white/60 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-white/15"
        />
        {movie?.poster && !preview && (
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              name="remove_poster"
              checked={removePoster}
              onChange={(e) => setRemovePoster(e.target.checked)}
              className="h-4 w-4"
            />
            Постер устгах
          </label>
        )}
        <Field label="Постергүй үеийн өнгө">
          <input
            name="hue"
            type="range"
            min={0}
            max={359}
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            className="w-full"
          />
        </Field>
      </aside>
    </form>
  );
}
