"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import FavoriteButton from "./FavoriteButton";
import { Player, useBuy, useMovieAccess, type Playing } from "./MovieDetail";
import Poster from "./Poster";
import { FREE_EPISODES, formatPrice, genreLabel, type Movie } from "@/lib/movies";
import { getPlayback } from "@/app/play-actions";
import { getAccessToken as accessToken } from "@/lib/supabase-browser";

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className="h-2.5 w-2.5">
      <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 12 7h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 6H6V4.5a2 2 0 1 1 4 0V7Z" />
    </svg>
  );
}

/**
 * Watch page of a series: the player on the left and the episode panel on the
 * right (stacked on phones). Nothing loads until play is pressed, so opening
 * the page doesn't count as a play.
 */
export default function SeriesWatch({
  movie,
  inModal = false,
}: {
  movie: Movie;
  inModal?: boolean;
}) {
  const router = useRouter();
  const unlocked = useMovieAccess(movie.id);
  const buy = useBuy(movie.id);
  const [current, setCurrent] = useState(1);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  // Only the latest episode clicked may start playing.
  const request = useRef(0);

  // Next keeps a closed page mounted but hidden; a hidden iframe would keep playing.
  useEffect(
    () => () => {
      request.current++;
      setPlaying(null);
      setLoading(false);
    },
    [],
  );

  const total = movie.episodes ?? 0;
  const isFree = (n: number) => unlocked || n <= FREE_EPISODES;
  const vertical = Boolean(movie.vertical);
  const frame = `rounded-2xl border border-line ${
    vertical ? "h-[72dvh] lg:h-[calc(100dvh-140px)] lg:min-h-[480px]" : "aspect-video w-full"
  }`;

  const start = async (n: number) => {
    const id = ++request.current;
    setMessage("");
    setPlaying(null);
    setLoading(true);
    try {
      const res = await getPlayback(movie.id, n, await accessToken());
      if (id !== request.current) return;
      if (res.ok) {
        setPlaying({
          title: `${movie.title} — ${n}-р анги`,
          kind: res.kind,
          url: res.url,
          edit: res.edit,
        });
      } else {
        setMessage(res.error);
      }
    } catch {
      if (id === request.current) setMessage("Видео ачаалахад алдаа гарлаа.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  };

  const select = (n: number) => {
    if (!isFree(n)) {
      buy();
      return;
    }
    setCurrent(n);
    start(n);
  };

  return (
    <div className="pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (inModal ? router.back() : router.push("/"))}
          aria-label="Буцах"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-lg transition-colors hover:bg-surface-2"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight sm:text-2xl">{movie.title}</h1>
          <p className="text-sm text-muted">{current}-р анги</p>
        </div>
        <FavoriteButton
          id={movie.id}
          withLabel
          className="flex h-11 shrink-0 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2 max-sm:[&>span]:hidden"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="min-w-0">
          {playing ? (
            <Player key={current} playing={playing} frameClassName={frame} />
          ) : (
            <div className={`relative flex items-center justify-center overflow-hidden bg-black ${frame}`}>
              <div className={`relative ${vertical ? "aspect-[9/16] h-full" : "h-full w-full"}`}>
                <Poster
                  movie={movie}
                  className="h-full w-full"
                  sizes="(max-width: 1024px) 100vw, 800px"
                  priority
                />
                <button
                  type="button"
                  onClick={() => start(current)}
                  disabled={loading}
                  aria-label={`${current}-р анги тоглуулах`}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 pl-1 text-2xl text-white backdrop-blur transition-colors hover:bg-black/80">
                    {loading ? "…" : "▶"}
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/60">
            <span className="font-semibold text-accent-light">★ {movie.rating.toFixed(1)}</span>
            <span>{movie.year}</span>
            <Link
              href={`/browse/${movie.genre}`}
              className="rounded border border-line px-1.5 py-0.5 text-xs text-white/70 hover:text-white"
            >
              {genreLabel(movie)}
            </Link>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{movie.description}</p>
        </div>

        <aside className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Ангиуд</h2>
              <p className="text-sm text-muted">Нийт {total} анги</p>
            </div>
            <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold">
              {current}-р анги
            </span>
          </div>

          <div className="mt-4 grid max-h-[480px] grid-cols-6 gap-2 overflow-y-auto">
            {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
              const free = isFree(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => select(n)}
                  aria-current={n === current ? "true" : undefined}
                  aria-label={free ? `${n}-р анги` : `${n}-р анги, түгжээтэй`}
                  className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-semibold transition-colors ${
                    n === current
                      ? "btn-accent"
                      : free
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "border border-line text-white/50 hover:text-white"
                  }`}
                >
                  {n}
                  {!free && <LockIcon />}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted">
            {unlocked ? (
              <b className="text-accent-light">Бүх анги нээлттэй.</b>
            ) : (
              <>
                <b className="text-accent-light">Эхний {FREE_EPISODES} анги үнэгүй.</b>{" "}
                <span className="inline-block align-[-1px]">
                  <LockIcon />
                </span>{" "}
                тэмдэгтэй ангиудыг цувралыг худалдаж авсны дараа үзнэ.
              </>
            )}
          </p>

          {message && <p className="mt-3 text-sm text-price">{message}</p>}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => select(current - 1)}
              disabled={current <= 1}
              className="h-11 rounded-xl border border-line bg-white/5 text-sm font-semibold transition-colors hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
            >
              ‹ Өмнөх анги
            </button>
            <button
              type="button"
              onClick={() => select(current + 1)}
              disabled={current >= total}
              className="btn-accent h-11 rounded-xl text-sm font-semibold disabled:opacity-40"
            >
              Дараагийн анги ›
            </button>
          </div>

          {!unlocked && (
            <>
              <button
                type="button"
                onClick={buy}
                className="mt-2 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white/5 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                Цувралыг худалдаж авах
                <span className="rounded-md bg-black/25 px-2 py-0.5 text-xs">
                  {formatPrice(movie.price)}
                </span>
              </button>
              <Link
                href="/subscription"
                className="mt-2 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm transition-colors hover:bg-accent/10"
              >
                <span className="text-white/60">
                  <b className="text-white">Гишүүнчлэл</b> — бүгд нэг дор
                </span>
                <span className="font-semibold text-accent-light">Үзэх →</span>
              </Link>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
