import Image from "next/image";
import type { Movie } from "@/lib/movies";

/**
 * Movie poster. Uses `movie.poster` when set, otherwise draws a generated
 * poster from the movie's hue and title so the grid never looks empty.
 */
export default function Poster({
  movie,
  className = "",
  sizes = "(max-width: 640px) 50vw, 200px",
  priority = false,
}: {
  movie: Movie;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (movie.poster) {
    return (
      <div className={`keep-dark relative overflow-hidden ${className}`}>
        <Image
          src={movie.poster}
          alt={movie.title}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  const h = movie.hue;
  return (
    <div
      role="img"
      aria-label={movie.title}
      className={`keep-dark relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(120% 70% at 50% 15%, hsl(${h} 70% 55% / 0.85), transparent 60%),
          radial-gradient(90% 60% at 80% 85%, hsl(${(h + 40) % 360} 80% 45% / 0.6), transparent 70%),
          linear-gradient(180deg, hsl(${h} 45% 22%), hsl(${(h + 20) % 360} 50% 8%))`,
      }}
    >
      {/* Silhouette */}
      <svg
        viewBox="0 0 100 150"
        className="absolute inset-x-0 bottom-0 h-[78%] w-full opacity-70"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
      >
        <defs>
          <linearGradient id={`fade-${movie.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.15" />
            <stop offset="1" stopColor="#000" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <path
          d="M50 22c9 0 15 8 15 18s-6 19-15 19-15-9-15-19 6-18 15-18Zm-31 72c3-18 15-28 31-28s28 10 31 28l6 56H13l6-56Z"
          fill={`url(#fade-${movie.id})`}
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      <p
        className="absolute inset-x-2 bottom-[16%] text-center text-[15px] leading-[1.05] font-black tracking-tight text-white uppercase [text-shadow:0_2px_12px_rgba(0,0,0,.8)] sm:text-[17px]"
        style={{ color: `hsl(${h} 90% 88%)` }}
      >
        {movie.title}
      </p>
    </div>
  );
}
