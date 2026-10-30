"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Upload } from "tus-js-client";
import {
  abortVideoUpload,
  finishVideoUpload,
  removeVideo,
  startVideoUpload,
} from "@/app/admin/video-actions";
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
  const uploadRef = useRef<Upload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void uploadRef.current?.abort(), []);

  const upload = async (file: File) => {
    setError("");
    setProgress(0);
    let videoId: string | undefined;
    try {
      const s = await startVideoUpload(movieId, slot.episode);
      videoId = s.videoId;
      await new Promise<void>((resolve, reject) => {
        const up = new Upload(file, {
          endpoint: s.endpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          chunkSize: 50 * 1024 * 1024,
          headers: {
            AuthorizationSignature: s.signature,
            AuthorizationExpire: String(s.expire),
            VideoId: s.videoId,
            LibraryId: String(s.libraryId),
          },
          metadata: { filetype: file.type || "video/mp4", title: s.title },
          onProgress: (sent, total) =>
            setProgress(Math.round((sent / total) * 100)),
          onError: reject,
          onSuccess: () => resolve(),
        });
        uploadRef.current = up;
        up.start();
      });
      await finishVideoUpload(movieId, slot.episode, s.videoId);
      onChanged();
    } catch (e) {
      if (videoId) await abortVideoUpload(videoId).catch(() => {});
      setError(e instanceof Error ? e.message : "Upload амжилтгүй боллоо.");
    } finally {
      uploadRef.current = null;
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const cancel = () => {
    uploadRef.current?.abort(true);
    uploadRef.current = null;
    setProgress(null);
    setError("Upload цуцлагдлаа.");
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
        {error && <p className="mt-1 text-xs text-hot">{error}</p>}
      </div>

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
}: {
  movieId: string;
  isSeries: boolean;
  slots: VideoSlot[];
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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
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
