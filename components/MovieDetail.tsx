"use client";

import Link from "next/link";
import { useState } from "react";
import Poster from "./Poster";
import FavoriteButton from "./FavoriteButton";
import { useApp } from "./AppProvider";
import {
  FREE_EPISODES,
  formatDuration,
  formatPrice,
  getGenreName,
  type Movie,
} from "@/lib/movies";
import { getPlayback } from "@/app/play-actions";

type Playing = { title: string; kind: "embed" | "file"; url: string };

function Player({
  playing,
  onClose,
}: {
  playing: Playing;
  onClose: () => void;
}) {
  return (
    <div className="relative flex aspect-video w-full items-center justify-center bg-black">
      {playing.kind === "embed" ? (
        <iframe
          src={playing.url}
          title={playing.title}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="h-full w-full border-0"
        />
      ) : (
        <video
          src={playing.url}
          controls
          autoPlay
          playsInline
          title={playing.title}
          className="h-full w-full"
        />
      )}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 left-3 rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
      >
        ← Буцах
      </button>
    </div>
  );
}

export function MovieDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex h-[230px] items-center justify-center bg-white/[.03] sm:h-[260px]">
        <div className="h-[200px] w-[133px] rounded-md bg-white/5 sm:h-[220px] sm:w-[147px]" />
      </div>
      <div className="space-y-3 px-5 pt-5 pb-6 sm:px-6">
        <div className="h-6 w-3/4 rounded bg-white/5" />
        <div className="h-4 w-1/2 rounded bg-white/5" />
        <div className="h-11 w-full rounded-lg bg-white/5" />
      </div>
    </div>
  );
}

export default function MovieDetail({
  movie,
  inModal = false,
}: {
  movie: Movie;
  inModal?: boolean;
}) {
  const { user, openAuth } = useApp();
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const buy = () => {
    if (!user) {
      openAuth("login");
      return;
    }
    setMessage("Төлбөрийн систем удахгүй холбогдоно.");
  };

  const playEpisode = async (n: number) => {
    if (n > FREE_EPISODES) {
      setMessage(`${n}-р ангийг үзэхийн тулд худалдаж авна уу.`);
      return;
    }
    setMessage("");
    setLoading(n);
    try {
      const res = await getPlayback(movie.id, n);
      if (res.ok) {
        setPlaying({
          title: `${movie.title} — ${n}-р анги`,
          kind: res.kind,
          url: res.url,
        });
      } else {
        setMessage(res.error);
      }
    } catch {
      setMessage("Видео ачаалахад алдаа гарлаа.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      {playing ? (
        <Player playing={playing} onClose={() => setPlaying(null)} />
      ) : (
        <div className="relative flex h-[230px] items-center justify-center overflow-hidden sm:h-[260px]">
          {/* Blurred backdrop */}
          <Poster
            movie={movie}
            className="absolute inset-0 scale-125 opacity-40 blur-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0e0e0e]" />
          <Poster
            movie={movie}
            className="relative h-[200px] w-[133px] rounded-md shadow-2xl sm:h-[220px] sm:w-[147px]"
            priority
          />
        </div>
      )}

      <div className="px-5 pt-5 pb-6 sm:px-6">
        <h1
          className={`font-bold tracking-tight ${
            inModal ? "text-xl sm:text-[22px]" : "text-2xl sm:text-3xl"
          }`}
        >
          {movie.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/60">
          <span className="font-semibold text-accent-light">
            ★ {movie.rating.toFixed(1)}
          </span>
          <span>{movie.year}</span>
          {movie.duration && <span>{formatDuration(movie.duration)}</span>}
          {movie.episodes && <span>{movie.episodes} анги</span>}
          <Link
            href={`/browse/${movie.genre}`}
            className="rounded border border-line px-1.5 py-0.5 text-xs text-white/70 hover:text-white"
          >
            {getGenreName(movie.genre)}
          </Link>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-white/60">
          {movie.description}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {movie.episodes ? (
            <button
              type="button"
              onClick={() => playEpisode(1)}
              className="btn-accent flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold"
            >
              {loading === 1 ? "Ачаалж байна…" : "▶ 1-р анги үзэх"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={buy}
            className={`flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-semibold ${
              movie.episodes
                ? "border border-line bg-white/5 hover:bg-white/10"
                : "btn-accent"
            }`}
          >
            Худалдаж авах
            <span className="rounded-md bg-black/25 px-2 py-0.5 text-xs">
              {formatPrice(movie.price)}
            </span>
          </button>
          <FavoriteButton
            id={movie.id}
            withLabel
            className="flex h-11 items-center rounded-lg border border-line bg-white/5 px-4 text-sm font-semibold hover:bg-white/10"
          />
        </div>

        {message && <p className="mt-3 text-sm text-price">{message}</p>}

        {movie.episodes ? (
          <div className="mt-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-semibold">Ангиуд</h2>
              <span className="text-xs text-muted">
                Эхний {FREE_EPISODES} анги үнэгүй
              </span>
            </div>
            <div className="grid max-h-[220px] grid-cols-6 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
              {Array.from({ length: movie.episodes }, (_, i) => i + 1).map(
                (n) => {
                  const free = n <= FREE_EPISODES;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => playEpisode(n)}
                      className={`relative h-10 rounded-lg text-sm font-medium transition-colors ${
                        free
                          ? "border border-accent/40 bg-accent/10 text-accent-light hover:bg-accent/20"
                          : "border border-line bg-surface text-white/50 hover:text-white"
                      }`}
                    >
                      {loading === n ? "…" : n}
                      {!free && (
                        <span className="absolute top-0.5 right-1 text-[8px]">
                          🔒
                        </span>
                      )}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ) : null}

        <Link
          href="/subscription"
          className="mt-6 flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm transition-colors hover:bg-accent/10"
        >
          <span className="text-white/60">
            <b className="text-white">Гишүүнчлэл</b> — бүх кино, цуврал нэг дор
          </span>
          <span className="font-semibold text-accent-light">Үзэх →</span>
        </Link>
      </div>
    </div>
  );
}
