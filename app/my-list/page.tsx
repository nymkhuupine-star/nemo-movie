"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { MovieGrid } from "@/components/MovieRow";
import { MOVIES } from "@/lib/movies";

export default function MyListPage() {
  const { favorites } = useApp();
  const movies = MOVIES.filter((m) => favorites.includes(m.id));

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <h1 className="mt-8 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
        <span className="h-6 w-1 rounded-full bg-accent" />
        Миний жагсаалт
      </h1>
      <p className="mt-1 text-sm text-muted">{movies.length} кино</p>
      <div className="mt-6">
        {movies.length ? (
          <MovieGrid movies={movies} />
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm text-muted">
              Жагсаалт хоосон байна. Киноны ♡ дээр дарж нэмээрэй.
            </p>
            <Link
              href="/"
              className="btn-accent mt-6 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold"
            >
              Кино үзэх
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
