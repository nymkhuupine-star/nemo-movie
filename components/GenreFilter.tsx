"use client";

import Link from "next/link";
import { useState } from "react";
import { MovieGrid, SectionTitle } from "./MovieRow";
import { GENRES, type Movie } from "@/lib/movies";

/**
 * Genre chips on the home page. "Бүгд" shows the server-rendered rows passed
 * as children; any other chip swaps them for a grid of that genre.
 */
export default function GenreFilter({
  movies,
  children,
}: {
  movies: Movie[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState("all");
  const genre = GENRES.find((g) => g.slug === active);
  const filtered = genre ? movies.filter((m) => m.genre === genre.slug) : [];

  const chip = (selected: boolean) =>
    `h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
      selected
        ? "btn-accent font-semibold"
        : "border border-line bg-surface text-white/70 hover:text-white"
    }`;

  return (
    <>
      <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => setActive("all")}
          className={chip(active === "all")}
        >
          Бүгд
        </button>
        {GENRES.map((g) => (
          <button
            key={g.slug}
            type="button"
            onClick={() => setActive(g.slug)}
            className={chip(active === g.slug)}
          >
            {g.name}
          </button>
        ))}
      </div>

      {genre ? (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle>{genre.name}</SectionTitle>
            <Link
              href={`/browse/${genre.slug}`}
              className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-white/70 hover:text-white"
            >
              Бүгдийг харах <span>›</span>
            </Link>
          </div>
          {filtered.length ? (
            <MovieGrid movies={filtered} />
          ) : (
            <p className="py-16 text-center text-sm text-muted">
              Энэ ангилалд одоогоор кино алга байна.
            </p>
          )}
        </section>
      ) : (
        children
      )}
    </>
  );
}
