import Link from "next/link";
import PlayIcon from "./PlayIcon";
import Poster from "./Poster";
import FavoriteButton from "./FavoriteButton";
import { formatPrice, genreLabel, type Movie } from "@/lib/movies";

export default function MovieCard({ movie }: { movie: Movie }) {
  return (
    <div className="group relative min-w-0">
      <Link
        href={`/movie/${movie.id}`}
        scroll={false}
        aria-label={movie.title}
        className="block"
      >
        <div className="relative overflow-hidden rounded-xl border border-line bg-surface">
          <Poster
            movie={movie}
            className="aspect-[2/3] w-full transition-transform duration-300 group-hover:scale-[1.04]"
          />

          <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-1">
            {movie.isNew ? (
              <span className="rounded-md bg-hot px-1.5 py-0.5 text-[10px] font-bold text-white">
                ШИНЭ
              </span>
            ) : movie.episodes ? (
              <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                {movie.episodes} анги
              </span>
            ) : (
              <span />
            )}
            <span className="rounded-md bg-price px-1.5 py-0.5 text-[10px] font-bold text-black">
              {formatPrice(movie.price)}
            </span>
          </div>

          <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[11px] font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,.9)]">
            <span className="text-accent-light">★</span>
            {movie.rating.toFixed(1)}
          </span>

          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <span className="btn-accent flex h-11 w-11 items-center justify-center rounded-full">
              <PlayIcon className="h-[22px] w-[22px]" />
            </span>
          </span>
        </div>
      </Link>

      <div className="mt-2.5 flex items-start justify-between gap-2">
        <Link
          href={`/movie/${movie.id}`}
          scroll={false}
          className="min-w-0 flex-1"
        >
          <h3 className="truncate text-[15px] font-semibold text-white">
            {movie.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            {genreLabel(movie)} · {movie.year}
          </p>
        </Link>
        <FavoriteButton id={movie.id} className="mt-0.5 text-base" />
      </div>
    </div>
  );
}
