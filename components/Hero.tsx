"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Poster from "./Poster";
import { getGenreName, type Movie } from "@/lib/movies";

function HeroCard({ movie, active }: { movie: Movie; active: boolean }) {
  return (
    <Link
      href={`/movie/${movie.id}`}
      scroll={false}
      className={`group relative w-[30%] max-w-[170px] shrink-0 overflow-hidden rounded-2xl border bg-[#141414] transition-all duration-500 ${
        active
          ? "z-10 -translate-y-3 border-white/25 shadow-[0_20px_50px_-15px_rgba(218,178,255,.45)]"
          : "border-line opacity-90"
      }`}
    >
      <div className="relative">
        <Poster movie={movie} className="aspect-[3/4] w-full" priority />
        <span className="absolute top-2 left-2 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-black uppercase">
          {movie.episodes ? `${movie.episodes} анги` : "Онцлох"}
        </span>
        <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold backdrop-blur">
          <span className="text-accent-light">★</span>
          {movie.rating.toFixed(1)}
        </span>
        <span className="btn-accent absolute right-2 -bottom-4 flex h-9 w-9 items-center justify-center rounded-full pl-0.5 text-sm transition-transform group-hover:scale-110">
          ▶
        </span>
      </div>
      <div className="px-3 pt-4 pb-3">
        <p className="truncate text-sm font-bold">{movie.title}</p>
        <p className="mt-1 text-[11px] font-medium text-accent-light">
          {getGenreName(movie.genre)} · {movie.year}
        </p>
      </div>
    </Link>
  );
}

export default function Hero({ movies }: { movies: Movie[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = movies.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 4000);
    return () => clearInterval(t);
  }, [paused, count]);

  const visible = [0, 1, 2].map((o) => movies[(index + o) % count]);

  return (
    <section className="relative mt-4 overflow-hidden rounded-3xl border border-line bg-[radial-gradient(120%_120%_at_0%_0%,rgba(218,178,255,.2),transparent_55%),linear-gradient(180deg,#110a18,#070707)] px-6 py-10 sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <h1 className="text-[40px] leading-[1.02] font-black tracking-[-1.5px] sm:text-[60px]">
            Шилдэг кино, цувралууд
            <span className="text-gradient block">нэг дор.</span>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/60">
            Хайр, өшөө авалт, тэрбумтан, ид шид — монгол хадмалтай дуртай
            түүхээ сонгоод шууд үзээрэй. Цувралын эхний 3 анги үнэгүй.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/movie/${movies[index].id}`}
              scroll={false}
              className="btn-accent flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold transition-transform hover:scale-[1.03]"
            >
              ▶ Одоо үзэх
            </Link>
            <Link
              href="/browse/trending"
              className="flex h-12 items-center gap-2 rounded-full border border-line bg-white/5 px-6 text-sm font-semibold transition-colors hover:bg-white/10"
            >
              Каталог <span className="text-white/60">›</span>
            </Link>
          </div>
        </div>

        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="flex items-center justify-center gap-3 pt-3 sm:gap-4">
            {visible.map((m, i) => (
              <HeroCard key={`${m.id}-${i}`} movie={m} active={i === 1} />
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-2">
            {movies.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}-р слайд`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-accent" : "w-1.5 bg-white/25"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
