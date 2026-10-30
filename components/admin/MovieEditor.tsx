"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveMovieData } from "@/app/admin/actions";
import { getEditorPreview, uploadCaption } from "@/app/admin/video-actions";
import { uploadEpisodeVideo, type UploadHandle } from "@/lib/upload-video";
import type { Genre, Movie, VideoEdit } from "@/lib/movies";
import VideoOverlays from "@/components/VideoOverlays";

export type MovieKind = "movie" | "series";

const INPUT =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-[15px] outline-none transition-colors placeholder:text-white/35 focus:border-accent/60";
const LABEL = "mb-2 block text-[15px] text-white/70";
const NEMO_LOGO = "/brand/nemo-logo.png";

type Draft = {
  title: string;
  genre: string;
  year: string;
  rating: string;
  duration: string;
  episodes: string;
  price: string;
  description: string;
  featured: boolean;
  trending: boolean;
  isNew: boolean;
  active: boolean;
  edit: VideoEdit;
};

const draftKey = (kind: MovieKind) => `nemo:movie-draft:${kind}`;

function fmtDuration(min?: number) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  return h ? `${h}ц ${min % 60}м` : `${min}м`;
}

function toClock(sec?: number) {
  if (!sec) return "";
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

function fromClock(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const [m, s] = t.includes(":") ? t.split(":") : ["0", t];
  const n = Number(m) * 60 + Number(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Temporary preview URL for a picked file, revoked when it changes. */
function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

function Section({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface-2/40 p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent-light">
          {n}
        </span>
        <div>
          <h3 className="text-xl font-bold tracking-tight">{title}</h3>
          {hint && <p className="mt-0.5 text-sm text-white/60">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2 text-[15px] text-white/75">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-black shadow transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </label>
  );
}

function ImagePick({
  label,
  wide,
  current,
  file,
  onFile,
}: {
  label: string;
  wide?: boolean;
  current?: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const src = useObjectUrl(file) ?? current;

  return (
    <div className="flex items-center gap-4">
      <div
        className={`keep-dark relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-surface text-sm text-white/40 ${
          wide ? "h-[100px] w-[180px]" : "h-[100px] w-[70px]"
        }`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-black/40">Байхгүй</span>
        )}
      </div>
      <div>
        <p className="text-[15px] text-white/80">{label}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="h-9 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-white/5"
          >
            Оруулах
          </button>
          {file && (
            <button
              type="button"
              onClick={() => onFile(null)}
              className="h-9 rounded-lg px-3 text-sm text-white/60 hover:text-white"
            >
              Болих
            </button>
          )}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

export default function MovieEditor({
  kind,
  genres,
  movie,
  videoSlot,
  onChangeKind,
  onCancel,
  onSaved,
}: {
  kind: MovieKind;
  genres: Genre[];
  movie?: Movie;
  /** Server-rendered video/episode manager (edit mode). */
  videoSlot?: React.ReactNode;
  onChangeKind?: () => void;
  onCancel: () => void;
  onSaved: (id: string, kind: MovieKind) => void;
}) {
  const isEdit = Boolean(movie);
  const initial: Draft = {
    title: movie?.title ?? "",
    genre: movie?.genre ?? genres[0]?.slug ?? "",
    year: String(movie?.year ?? new Date().getFullYear()),
    rating: String(movie?.rating ?? 7.5),
    duration: fmtDuration(movie?.duration),
    episodes: movie?.episodes ? String(movie.episodes) : "",
    price: String(movie?.price ?? 4900),
    description: movie?.description ?? "",
    featured: movie?.featured ?? false,
    trending: movie?.trending ?? false,
    isNew: movie?.isNew ?? !isEdit,
    active: !(movie?.hidden ?? false),
    edit: movie?.edit ?? { logoPos: "tr", logoSize: 12, blurs: [] },
  };
  const [d, setD] = useState<Draft>(initial);
  const [restored, setRestored] = useState(false);
  const [poster, setPoster] = useState<File | null>(null);
  const [backdrop, setBackdrop] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [subtitle, setSubtitle] = useState<File | null>(null);
  const [orientation, setOrientation] = useState<"h" | "v">("h");
  const [tab, setTab] = useState<"logo" | "blur" | "subs" | "time">("logo");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const uploadRef = useRef<UploadHandle | null>(null);
  // Set once the movie row exists, so a retry after a failed upload updates
  // that row instead of creating a duplicate.
  const savedId = useRef<string | null>(movie?.id ?? null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const subInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const setEdit = (patch: Partial<VideoEdit>) => setD((p) => ({ ...p, edit: { ...p.edit, ...patch } }));

  // Draft: restore once, then save text fields on every change (new movies only).
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(draftKey(kind));
      const saved = raw ? (JSON.parse(raw) as Partial<Draft>) : null;
      if (saved && (saved.title || saved.description)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setD((p) => ({ ...p, ...saved }));
        setRestored(true);
      }
    } catch {}
  }, [isEdit, kind]);
  useEffect(() => {
    if (isEdit || !(d.title || d.description)) return;
    try {
      localStorage.setItem(draftKey(kind), JSON.stringify(d));
    } catch {}
  }, [d, isEdit, kind]);

  const videoUrl = useObjectUrl(video);
  // Edit mode: preview the video that's already on Bunny.
  const [savedPreview, setSavedPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!movie?.id) return;
    let cancelled = false;
    getEditorPreview(movie.id).then((url) => !cancelled && setSavedPreview(url));
    return () => {
      cancelled = true;
    };
  }, [movie?.id]);
  const logoPreview = useObjectUrl(logo);

  useEffect(() => () => uploadRef.current?.abort(), []);

  const previewEdit: VideoEdit = { ...d.edit, logoUrl: logoPreview ?? d.edit.logoUrl };
  const blurs = d.edit.blurs ?? [];

  const submit = async () => {
    setError("");
    setBusy(true);
    setStatus("Хадгалж байна…");
    const f = new FormData();
    if (savedId.current) f.set("id", savedId.current);
    f.set("kind", kind);
    f.set("title", d.title);
    f.set("genre", d.genre);
    f.set("year", d.year);
    f.set("rating", d.rating);
    f.set("price", d.price);
    f.set("description", d.description);
    if (kind === "movie") f.set("duration", d.duration);
    else f.set("episodes", d.episodes);
    if (d.featured) f.set("featured", "on");
    if (d.trending) f.set("trending", "on");
    if (d.isNew) f.set("is_new", "on");
    if (d.active) f.set("active", "on");
    f.set("hue", String(movie?.hue ?? Math.floor(Math.random() * 360)));
    f.set("edit", JSON.stringify(d.edit));
    if (poster) f.set("poster", poster);
    if (backdrop) f.set("backdrop", backdrop);
    if (logo) f.set("logo", logo);

    try {
      const res = await saveMovieData(f);
      if (!res.ok) throw new Error(res.error);
      const firstSave = !savedId.current;
      savedId.current = res.id;
      if (firstSave && !isEdit) {
        try {
          localStorage.removeItem(draftKey(kind));
        } catch {}
      }

      if (kind === "movie" && video) {
        try {
          await uploadEpisodeVideo(res.id, 1, video, (p) => setStatus(`Бичлэг upload: ${p}%`), (h) => {
            uploadRef.current = h;
          });
        } catch (e) {
          throw new Error(
            `Кино хадгалагдсан, гэхдээ бичлэг upload амжилтгүй: ${
              e instanceof Error ? e.message : "алдаа"
            }. “Кино нэмэх”-ийг дахин дарж оролдоно уу.`,
          );
        }
        setVideo(null);
      }
      if (kind === "movie" && subtitle) {
        setStatus("Хадмал илгээж байна…");
        const c = new FormData();
        c.set("movieId", res.id);
        c.set("episode", "1");
        c.set("file", subtitle);
        const r = await uploadCaption(c);
        if (!r.ok) throw new Error(`Кино хадгалагдсан ч хадмал алдаатай: ${r.error}`);
        setSubtitle(null);
      }
      if (!isEdit) {
        try {
          localStorage.removeItem(draftKey(kind));
        } catch {}
      }
      setStatus("");
      onSaved(res.id, kind);
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : "Алдаа гарлаа.");
    } finally {
      uploadRef.current = null;
      setBusy(false);
    }
  };

  const tabBtn = (key: typeof tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`h-11 flex-1 rounded-xl text-[15px] font-medium transition-colors ${
        tab === key ? "btn-accent font-semibold" : "text-white/70 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-6">
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/60 px-4 py-3 text-sm">
          <span>
            <span className="text-white/60">Төрөл: </span>
            <b>{kind === "series" ? "📺 Олон ангитай цуврал" : "🎬 Ганц ангитай кино"}</b>
          </span>
          {onChangeKind && (
            <button type="button" onClick={onChangeKind} className="font-medium text-accent-light underline">
              Солих
            </button>
          )}
        </div>

        {restored && (
          <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-accent-light">
            Өмнөх ноорог сэргээгдлээ.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                setD(initial);
                setRestored(false);
                try {
                  localStorage.removeItem(draftKey(kind));
                } catch {}
              }}
            >
              Цэвэрлэх
            </button>
          </p>
        )}

        <Section n={1} title="Үндсэн мэдээлэл">
          <div className="space-y-4">
            <label className="block">
              <span className={LABEL}>Нэр</span>
              <input
                value={d.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="жишээ нь: Neon Horizon"
                className={INPUT}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>Төрөл</span>
                <select value={d.genre} onChange={(e) => set("genre", e.target.value)} className={INPUT}>
                  {genres.map((g) => (
                    <option key={g.slug} value={g.slug}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={LABEL}>Он</span>
                <input type="number" value={d.year} onChange={(e) => set("year", e.target.value)} className={INPUT} />
              </label>
              <label className="block">
                <span className={LABEL}>Үнэлгээ (0–10)</span>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={10}
                  value={d.rating}
                  onChange={(e) => set("rating", e.target.value)}
                  className={INPUT}
                />
              </label>
              {kind === "movie" ? (
                <label className="block">
                  <span className={LABEL}>Үргэлжлэх хугацаа</span>
                  <input
                    value={d.duration}
                    onChange={(e) => set("duration", e.target.value)}
                    placeholder="жишээ нь: 2ц 15м"
                    className={INPUT}
                  />
                </label>
              ) : (
                <label className="block">
                  <span className={LABEL}>Ангийн тоо</span>
                  <input
                    type="number"
                    min={1}
                    value={d.episodes}
                    onChange={(e) => set("episodes", e.target.value)}
                    placeholder="жишээ нь: 40"
                    className={INPUT}
                  />
                </label>
              )}
              <label className="block">
                <span className={LABEL}>Үнэ (₮)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={d.price}
                  onChange={(e) => set("price", e.target.value)}
                  className={INPUT}
                />
              </label>
            </div>
            <label className="block">
              <span className={LABEL}>Тайлбар (заавал биш)</span>
              <textarea
                rows={4}
                value={d.description}
                onChange={(e) => set("description", e.target.value)}
                className={`${INPUT} h-auto py-3`}
              />
            </label>
          </div>
        </Section>

        <Section
          n={2}
          title="Зураг"
          hint="Постер нь картан дээр харагдана. Дэвсгэр заавал биш: оруулаагүй бол постерыг ашиглана."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <ImagePick label="Постер (босоо)" current={movie?.poster} file={poster} onFile={setPoster} />
            <ImagePick
              label="Дэвсгэр (хэвтээ) · заавал биш"
              wide
              current={movie?.backdrop}
              file={backdrop}
              onFile={setBackdrop}
            />
          </div>
        </Section>

        <Section n={3} title={kind === "series" ? "Ангиуд ба хадмал" : "Бичлэг ба хадмал"}>
          {videoSlot ? (
            <div className="space-y-2">
              {videoSlot}
              <p className="text-sm text-white/55">
                Анги бүрийн “Хадмал” товчоор .srt / .vtt монгол хадмал оруулна.
              </p>
            </div>
          ) : kind === "series" ? (
            <p className="rounded-xl border border-line bg-surface px-4 py-4 text-sm text-white/65">
              Цувралыг хадгалсны дараа анги бүрийн бичлэг, хадмалыг нэмэх хэсэг нээгдэнэ.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-4 py-4">
                <span className="text-xl">🎞️</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Бичлэг</p>
                  <p className="truncate text-sm text-white/60">
                    {video
                      ? `${video.name} · ${(video.size / 1024 / 1024).toFixed(1)} MB`
                      : "Одоогоор бичлэг ороогүй"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => videoInput.current?.click()}
                  className="btn-accent h-10 rounded-lg px-4 text-sm font-semibold"
                >
                  {video ? "Солих" : "Бичлэг сонгох"}
                </button>
                <input
                  ref={videoInput}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-4 py-4">
                <span className="text-xl">💬</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Монгол хадмал (заавал биш)</p>
                  <p className="text-sm text-white/60">
                    {subtitle ? subtitle.name : ".srt / .vtt файл оруулна."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => subInput.current?.click()}
                  className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-white/5"
                >
                  Файл оруулах
                </button>
                <input
                  ref={subInput}
                  type="file"
                  accept=".srt,.vtt"
                  className="hidden"
                  onChange={(e) => setSubtitle(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          )}
        </Section>

        <Section n={4} title="Видео засвар" hint="Лого, блюр, хадмал ба киноны эхлэл, төгсгөл.">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-white/60">Урьдчилан харах</span>
            <div className="flex rounded-xl border border-line bg-surface p-1 text-sm">
              {(["h", "v"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrientation(o)}
                  className={`rounded-lg px-3 py-1.5 ${
                    orientation === o ? "bg-accent/15 font-semibold text-accent-light" : "text-white/60"
                  }`}
                >
                  {o === "h" ? "▭ Хэвтээ" : "▯ Босоо"}
                </button>
              ))}
            </div>
          </div>
          <div className="keep-dark flex justify-center rounded-xl bg-[#000]">
            <div
              data-overlay-box
              className={`relative overflow-hidden ${
                orientation === "h" ? "aspect-video w-full" : "aspect-[9/16] h-[420px]"
              }`}
            >
              {videoUrl ? (
                <video
                  ref={previewRef}
                  src={videoUrl}
                  controls
                  className="h-full w-full object-contain"
                />
              ) : savedPreview ? (
                <iframe
                  src={savedPreview}
                  title="Урьдчилан харах"
                  allow="autoplay; encrypted-media; fullscreen"
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
                  {isEdit && movie?.backdrop ? (
                    <Image src={movie.backdrop} alt="" fill className="object-cover opacity-60" />
                  ) : null}
                  <span className="relative">
                    {kind === "movie" ? "Бичлэг оруулсны дараа энд харагдана" : "Анги бүрт энэ засвар хэрэглэгдэнэ"}
                  </span>
                </div>
              )}
              <VideoOverlays edit={previewEdit} onChange={setEdit} />
            </div>
          </div>

          <div className="mt-4 flex gap-1 rounded-2xl border border-line bg-surface p-1">
            {tabBtn("logo", "Лого")}
            {tabBtn("blur", "Блюр")}
            {tabBtn("subs", "Хадмал")}
            {tabBtn("time", "Хугацаа")}
          </div>

          <div className="mt-4">
            {tab === "logo" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="keep-dark flex h-16 w-28 items-center justify-center rounded-lg border border-dashed border-line bg-[#111] p-2 text-sm text-white/40">
                    {previewEdit.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewEdit.logoUrl} alt="" className="max-h-full max-w-full" />
                    ) : (
                      "Лого алга"
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => logoInput.current?.click()}
                    className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-white/5"
                  >
                    Лого оруулах
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLogo(null);
                      setEdit({ logoUrl: NEMO_LOGO });
                    }}
                    className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-white/5"
                  >
                    Nemo лого
                  </button>
                  {previewEdit.logoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogo(null);
                        setEdit({ logoUrl: undefined });
                      }}
                      className="h-10 rounded-lg px-3 text-sm text-hot"
                    >
                      Хасах
                    </button>
                  )}
                  <input
                    ref={logoInput}
                    type="file"
                    accept="image/png,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                  />
                </div>
                <p className="text-sm text-white/55">
                  Дэвсгэргүй PNG / SVG лого зөвлөнө. Урьдчилан харах дээр чирж зөөнө, цэнхэр
                  бөмбөлгөөс чирж хэмжээг өөрчилнө.
                </p>
                {previewEdit.logoUrl && (
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex gap-1">
                      {(
                        [
                          ["tl", "↖"],
                          ["tr", "↗"],
                          ["bl", "↙"],
                          ["br", "↘"],
                        ] as const
                      ).map(([p, icon]) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setEdit({ logoPos: p, logoX: undefined, logoY: undefined })}
                          className={`h-9 w-9 rounded-lg border ${
                            (d.edit.logoPos ?? "tr") === p
                              ? "border-accent bg-accent/10 text-accent-light"
                              : "border-line text-white/60"
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <label className="flex flex-1 items-center gap-3 text-sm text-white/70">
                      Хэмжээ
                      <input
                        type="range"
                        min={4}
                        max={60}
                        value={d.edit.logoSize ?? 12}
                        onChange={(e) => setEdit({ logoSize: Number(e.target.value) })}
                        className="flex-1 accent-[var(--color-accent)]"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {tab === "blur" && (
              <div className="space-y-3">
                <p className="text-sm text-white/60">
                  Бичлэг дээрх хуучин лого, бичвэрийг дарна. Урьдчилан харах дээр чирж зөөнө,
                  баруун доод булангийн цэнхэр бөмбөлгөөс чирж хэмжээг өөрчилнө.
                </p>
                {blurs.map((b, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface p-3 sm:grid-cols-5 sm:items-center">
                    <span className="text-sm font-medium">Блюр {i + 1}</span>
                    {(["w", "h"] as const).map((k) => (
                      <label key={k} className="flex items-center gap-2 text-xs text-white/60">
                        {k === "w" ? "Өргөн" : "Өндөр"}
                        <input
                          type="range"
                          min={3}
                          max={100}
                          value={b[k]}
                          onChange={(e) =>
                            setEdit({
                              blurs: blurs.map((x, j) => (j === i ? { ...x, [k]: Number(e.target.value) } : x)),
                            })
                          }
                          className="flex-1 accent-[var(--color-accent)]"
                        />
                      </label>
                    ))}
                    <span className="text-xs text-white/40">
                      x {Math.round(b.x)}% · y {Math.round(b.y)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setEdit({ blurs: blurs.filter((_, j) => j !== i) })}
                      className="justify-self-end text-sm text-hot"
                    >
                      Устгах
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={blurs.length >= 6}
                  onClick={() => setEdit({ blurs: [...blurs, { x: 70, y: 5, w: 25, h: 12 }] })}
                  className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-white/5 disabled:opacity-40"
                >
                  + Блюр нэмэх
                </button>
              </div>
            )}

            {tab === "subs" && (
              <p className="rounded-xl border border-line bg-surface px-4 py-4 text-sm leading-relaxed text-white/65">
                Монгол хадмал тоглуулагчийн <b>CC</b> товчоор гарна.{" "}
                {kind === "movie"
                  ? subtitle
                    ? `Сонгосон файл: ${subtitle.name}`
                    : "3-р хэсгээс .srt / .vtt файл оруулна уу."
                  : "Анги бүрт 3-р хэсгийн “Хадмал” товчоор оруулна."}{" "}
                Хадмалыг үргэлж асаалттай харуулах бол Bunny → Stream → Player → Captions-аас
                “Монгол”-ыг анхдагч болгоно.
              </p>
            )}

            {tab === "time" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["startSec", "Эхлэх цэг", "Интро алгасах"],
                    ["endSec", "Дуусах цэг", "Төгсгөлийн титр таслах"],
                  ] as const
                ).map(([k, label, hint]) => (
                  <label key={k} className="block">
                    <span className={LABEL}>
                      {label} <span className="text-sm text-white/45">· {hint}</span>
                    </span>
                    <div className="flex gap-2">
                      <input
                        value={toClock(d.edit[k])}
                        onChange={(e) => setEdit({ [k]: fromClock(e.target.value) })}
                        placeholder="мм:сс"
                        className={INPUT}
                      />
                      {videoUrl && (
                        <button
                          type="button"
                          onClick={() => setEdit({ [k]: Math.floor(previewRef.current?.currentTime ?? 0) || undefined })}
                          className="shrink-0 rounded-xl border border-line bg-surface px-3 text-sm hover:bg-white/5"
                        >
                          Одоогийн цэг
                        </button>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section n={5} title="Сайт дээр харуулах">
          <div className="divide-y divide-line">
            <Switch label="Нүүр хуудасны онцлох хэсэгт харуулах" checked={d.featured} onChange={(v) => set("featured", v)} />
            <Switch label="“Тренд болж буй” хэсэгт харуулах" checked={d.trending} onChange={(v) => set("trending", v)} />
            <Switch label="“Шинээр нэмэгдсэн” хэсэгт харуулах" checked={d.isNew} onChange={(v) => set("isNew", v)} />
            <Switch
              label="Идэвхтэй (унтраавал сайт дээр харагдахгүй, устгагдахгүй)"
              checked={d.active}
              onChange={(v) => set("active", v)}
            />
          </div>
        </Section>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-surface pt-4 pb-1">
        <p className="mr-auto text-sm text-white/55">
          {error ? (
            <span className="text-hot">{error}</span>
          ) : status ? (
            <span className="text-accent-light">{status}</span>
          ) : isEdit ? null : (
            "Ноорог автоматаар хадгалагдана"
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            uploadRef.current?.abort();
            onCancel();
          }}
          className="h-12 rounded-xl border border-line bg-surface px-6 text-[15px] font-semibold hover:bg-white/5"
        >
          Цуцлах
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="btn-accent h-12 rounded-xl px-6 text-[15px] font-semibold disabled:opacity-60"
        >
          {busy
            ? "Түр хүлээнэ үү…"
            : isEdit
              ? "Өөрчлөлтийг хадгалах"
              : kind === "series"
                ? "Цуврал нэмэх"
                : "Кино нэмэх"}
        </button>
      </div>
    </div>
  );
}
