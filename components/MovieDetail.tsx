"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import VideoOverlays from "./VideoOverlays";
import { EXPANDED_FRAME, ExpandButton, useExpand } from "./useExpand";
import PlayIcon from "./PlayIcon";
import Poster from "./Poster";
import FavoriteButton from "./FavoriteButton";
import { useApp } from "./AppProvider";
import {
  embedFit,
  expandedBoxFit,
  formatDuration,
  formatPrice,
  genreLabel,
  type Movie,
  type VideoEdit,
} from "@/lib/movies";
import { getMyAccess, getPlayback } from "@/app/play-actions";
import { trackMeta } from "@/lib/meta-pixel";
import { getAccessToken as accessToken } from "@/lib/supabase-browser";
import type { Access } from "@/lib/access";

export type Playing = {
  title: string;
  kind: "embed" | "file";
  url: string;
  edit: VideoEdit;
  aspect?: number;
};

type PlayerJs = {
  on: (e: string, cb: (d?: { seconds: number }) => void) => void;
  off: (e: string) => void;
  pause: () => void;
};
declare global {
  interface Window {
    playerjs?: { Player: new (el: HTMLIFrameElement) => PlayerJs };
  }
}

const PLAYERJS_SRC = "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";

/** Loads Bunny's player.js once; resolves with the global. */
function loadPlayerJs(): Promise<NonNullable<Window["playerjs"]>> {
  if (window.playerjs) return Promise.resolve(window.playerjs);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PLAYERJS_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => window.playerjs && resolve(window.playerjs));
    script.addEventListener("error", reject);
    if (!existing) {
      script.src = PLAYERJS_SRC;
      document.head.appendChild(script);
    }
  });
}

export function Player({
  playing,
  onClose,
  frameClassName = "aspect-video w-full",
}: {
  playing: Playing;
  onClose?: () => void;
  frameClassName?: string;
}) {
  const { edit } = playing;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ended, setEnded] = useState(false);
  const { frame, expanded, toggle } = useExpand();
  const [fileAspect, setFileAspect] = useState<number>();
  // The iframe is only mounted once player.js is ready, so "ready" isn't missed.
  const [pjsReady, setPjsReady] = useState(playing.kind !== "embed" || !edit.endSec);

  useEffect(() => {
    if (playing.kind !== "embed" || !edit.endSec) return;
    let cancelled = false;
    loadPlayerJs()
      .then(() => !cancelled && setPjsReady(true))
      .catch(() => !cancelled && setPjsReady(true));
    return () => {
      cancelled = true;
    };
  }, [playing.kind, edit.endSec]);

  // Stop at the end point set in the admin ("Хугацаа").
  useEffect(() => {
    if (playing.kind !== "embed" || !edit.endSec || !pjsReady || !window.playerjs) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const player = new window.playerjs.Player(iframe);
    const end = edit.endSec;
    player.on("ready", () => {
      player.on("timeupdate", (d) => {
        if (d && d.seconds >= end) {
          player.pause();
          setEnded(true);
        }
      });
    });
    return () => player.off("timeupdate");
  }, [playing.kind, edit.endSec, pjsReady]);

  return (
    <div
      ref={frame}
      className={`flex items-center justify-center overflow-hidden bg-black ${
        expanded ? EXPANDED_FRAME : `relative ${frameClassName}`
      }`}
    >
      {/* Overlay positions are % of this box, so it must match the admin preview. */}
      <div
        data-overlay-box
        className={`relative flex items-center justify-center overflow-hidden ${
          expanded ? "" : edit.vertical ? "aspect-[9/16] h-full" : "h-full w-full"
        }`}
        style={expanded ? expandedBoxFit(playing.aspect ?? fileAspect, edit.vertical) : undefined}
      >
        {playing.kind === "embed" ? (
          pjsReady && (
            <iframe
              ref={iframeRef}
              src={playing.url}
              title={playing.title}
              // No fullscreen permission: ExpandButton replaces the player's own button.
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              className="border-0"
              style={embedFit(playing.aspect, edit.vertical)}
            />
          )
        ) : (
          <video
            src={playing.url}
            controls
            controlsList="nofullscreen"
            autoPlay
            playsInline
            title={playing.title}
            // Shaped like the video so its controls stay on screen when enlarged.
            style={embedFit(fileAspect, edit.vertical)}
            onLoadedMetadata={(e) => {
              if (edit.startSec) e.currentTarget.currentTime = edit.startSec;
              const { videoWidth, videoHeight } = e.currentTarget;
              if (videoWidth && videoHeight) setFileAspect(videoWidth / videoHeight);
            }}
            onTimeUpdate={(e) => {
              if (edit.endSec && e.currentTarget.currentTime >= edit.endSec) {
                e.currentTarget.pause();
                setEnded(true);
              }
            }}
          />
        )}
        <VideoOverlays edit={edit} />
        {ended && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-white/80">
            Дууслаа
          </div>
        )}
      </div>
      <ExpandButton expanded={expanded} onClick={toggle} />
      {onClose && !expanded && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 z-10 rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
        >
          ← Буцах
        </button>
      )}
    </div>
  );
}

/** Asks the server whether the signed-in user may watch this title. */
export function useMovieAccess(movieId: string): boolean {
  const { user } = useApp();
  const [access, setAccess] = useState<Access | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = user ? await accessToken() : undefined;
      const result = token ? await getMyAccess(movieId, token) : null;
      if (!cancelled) setAccess(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, movieId]);

  return Boolean(access?.subscriptionUntil || access?.ownsMovie);
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

/** Tells Meta which title the visitor opened, for ads. */
export function useTrackView({ id, title, price }: Movie) {
  useEffect(() => {
    trackMeta("ViewContent", {
      content_ids: [id],
      content_name: title,
      content_type: "product",
      value: price,
      currency: "MNT",
    });
  }, [id, title, price]);
}

/** Goes to the payment page, which asks to sign in once an option is picked. */
export function useBuy({ id, title, price }: Movie) {
  const router = useRouter();
  return () => {
    trackMeta("AddToCart", {
      content_ids: [id],
      content_name: title,
      content_type: "product",
      value: price,
      currency: "MNT",
    });
    router.push(`/pay/${id}`);
  };
}

/** Detail view of a single movie. Series use SeriesWatch instead. */
export default function MovieDetail({
  movie,
  inModal = false,
}: {
  movie: Movie;
  inModal?: boolean;
}) {
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const unlocked = useMovieAccess(movie.id);
  const buy = useBuy(movie);
  useTrackView(movie);

  // Next keeps a closed page mounted but hidden; a hidden iframe would keep playing.
  useEffect(() => () => setPlaying(null), []);

  const play = async () => {
    setMessage("");
    setLoading(true);
    try {
      const res = await getPlayback(movie.id, 1, await accessToken());
      if (res.ok) {
        setPlaying({
          title: movie.title,
          kind: res.kind,
          url: res.url,
          edit: res.edit,
          aspect: res.aspect,
        });
      } else {
        setMessage(res.error);
      }
    } catch {
      setMessage("Видео ачаалахад алдаа гарлаа.");
    } finally {
      setLoading(false);
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
          <Link
            href={`/browse/${movie.genre}`}
            className="rounded border border-line px-1.5 py-0.5 text-xs text-white/70 hover:text-white"
          >
            {genreLabel(movie)}
          </Link>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-white/60">
          {movie.description}
        </p>

        <div className={`mt-5 flex gap-2 min-[360px]:gap-3 ${unlocked ? "" : "flex-wrap"}`}>
          {unlocked ? (
            <button
              type="button"
              onClick={play}
              className="btn-accent flex h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold min-[360px]:px-4 sm:px-5"
            >
              {loading ? (
                "Ачаалж байна…"
              ) : (
                <>
                  <PlayIcon className="h-5 w-5" />
                  Үзэх
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={buy}
              className="btn-accent flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-semibold"
            >
              Худалдаж авах
              <span className="rounded-md bg-black/25 px-2 py-0.5 text-xs">
                {formatPrice(movie.price)}
              </span>
            </button>
          )}
          <FavoriteButton
            id={movie.id}
            withLabel
            className="flex h-11 items-center rounded-lg border border-line bg-white/5 px-2 text-sm font-semibold whitespace-nowrap hover:bg-white/10 min-[360px]:px-3 sm:px-4"
          />
        </div>

        {message && <p className="mt-3 text-sm text-price">{message}</p>}

        {!unlocked && (
          <Link
            href="/subscription"
            className="mt-6 flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm transition-colors hover:bg-accent/10"
          >
            <span className="text-white/60">
              <b className="text-white">Гишүүнчлэл</b> — бүх кино, цуврал нэг дор
            </span>
            <span className="font-semibold text-accent-light">Үзэх →</span>
          </Link>
        )}
      </div>
    </div>
  );
}
