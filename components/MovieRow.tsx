import Link from "next/link";
import MovieCard from "./MovieCard";
import type { Movie } from "@/lib/movies";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
      <span className="h-4 w-1 rounded-full bg-accent" />
      {children}
    </h2>
  );
}

export function MovieGrid({ movies }: { movies: Movie[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {movies.map((m) => (
        <MovieCard key={m.id} movie={m} />
      ))}
    </div>
  );
}

export default function MovieRow({
  title,
  href,
  movies,
}: {
  title: string;
  href: string;
  movies: Movie[];
}) {
  if (!movies.length) return null;
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <SectionTitle>{title}</SectionTitle>
        <Link
          href={href}
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-accent/50 hover:text-white"
        >
          Бүгдийг харах <span>›</span>
        </Link>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:grid-cols-4 lg:grid-cols-6">
        {movies.slice(0, 6).map((m) => (
          <div key={m.id} className="w-[42%] shrink-0 snap-start sm:w-auto">
            <MovieCard movie={m} />
          </div>
        ))}
      </div>
    </section>
  );
}
