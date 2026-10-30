"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { removeVideo, uploadCaption } from "@/app/admin/video-actions";
import { uploadEpisodeVideo, type UploadHandle } from "@/lib/upload-video";
import type { VideoSlot } from "@/lib/videos";

const READY = 4;

function SlotRow({
  movieId,
  slot,
  label,
  onChanged,
}: {
  movieId: string;
  slot: VideoSlot;
  label: string;
  onChanged: () => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const uploadRef = useRef<UploadHandle | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => uploadRef.current?.abort(), []);

  const upload = async (file: File) => {
    setError("");
    setNote("");
    setProgress(0);
    try {
      await uploadEpisodeVideo(movieId, slot.episode, file, setProgress, (h) => {
        uploadRef.current = h;
      });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload амжилтгүй боллоо.");
    } finally {
      uploadRef.current = null;
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const cancel = () => uploadRef.current?.abort();

  const caption = async (file: File) => {
    setError("");
    setNote("Хадмал илгээж байна…");
    const form = new FormData();
    form.set("movieId", movieId);
    form.set("episode", String(slot.episode));
    form.set("file", file);
    const res = await uploadCaption(form);
    setNote(res.ok ? "✓ Монгол хадмал нэмэгдлээ" : "");
    if (!res.ok) setError(res.error ?? "Алдаа гарлаа.");
    if (captionRef.current) captionRef.current.value = "";
  };

  const remove = async () => {
    if (!confirm(`${label}-ийн видеог устгах уу?`)) return;
    setBusy(true);
    try {
      await removeVideo(movieId, slot.episode);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Устгаж чадсангүй.");
    } finally {
      setBusy(false);
    }
  };

  const uploading = progress !== null;
  const ready = slot.status === READY;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
      <span className="w-20 shrink-0 text-sm font-medium">{label}</span>

      <div className="min-w-[160px] flex-1">
        {uploading ? (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">Upload: {progress}%</p>
          </div>
        ) : slot.hasVideo ? (
          <p className={`text-xs ${ready ? "text-accent-light" : "text-price"}`}>
            ● {slot.statusLabel ?? "Видео байна"}
            {!ready && slot.progress ? ` (${slot.progress}%)` : ""}
          </p>
        ) : (
          <p className="text-xs text-muted">Видео алга</p>
        )}
        {note && <p className="mt-1 text-xs text-accent-light">{note}</p>}
        {error && <p className="mt-1 text-xs text-hot">{error}</p>}
      </div>

      <input
        ref={captionRef}
        type="file"
        accept=".srt,.vtt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void caption(file);
        }}
      />
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {uploading ? (
        <button
          type="button"
          onClick={cancel}
          className="h-8 rounded-lg border border-line px-3 text-xs text-white/70"
        >
          Цуцлах
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-accent h-8 rounded-lg px-3 text-xs font-semibold"
          >
            {slot.hasVideo ? "Солих" : "Upload"}
          </button>
          {slot.hasVideo && (
            <button
              type="button"
              onClick={() => captionRef.current?.click()}
              className="h-8 rounded-lg border border-line px-3 text-xs text-white/80 hover:bg-white/5"
            >
              Хадмал
            </button>
          )}
          {slot.hasVideo && (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="h-8 rounded-lg border border-hot/30 px-3 text-xs text-hot hover:bg-hot/10 disabled:opacity-50"
            >
              Устгах
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function VideoManager({
  movieId,
  isSeries,
  slots,
  bare = false,
}: {
  movieId: string;
  isSeries: boolean;
  slots: VideoSlot[];
  /** Without the outer card (when embedded in the movie editor). */
  bare?: boolean;
}) {
  const router = useRouter();
  const encoding = slots.some((s) => s.hasVideo && s.status !== undefined && s.status < READY);

  // Refresh while Bunny is still encoding so the status updates by itself.
  useEffect(() => {
    if (!encoding) return;
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [encoding, router]);

  return (
    <div className={bare ? "overflow-hidden rounded-xl border border-line" : "overflow-hidden rounded-2xl border border-line bg-surface"}>
      <div className="max-h-[520px] overflow-y-auto">
        {slots.map((slot) => (
          <SlotRow
            key={slot.episode}
            movieId={movieId}
            slot={slot}
            label={isSeries ? `${slot.episode}-р анги` : "Кино"}
            onChanged={() => router.refresh()}
          />
        ))}
      </div>
    </div>
  );
}
