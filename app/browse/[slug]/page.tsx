import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MovieGrid } from "@/components/MovieRow";
import {
  COLLECTIONS,
  GENRES,
  getGenre,
  getMoviesBySlug,
} from "@/lib/movies";

const PAGE_SIZE = 24;

export function generateStaticParams() {
  return [...GENRES, ...COLLECTIONS].map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/browse/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: getGenre(slug)?.name ?? "Ангилал" };
}

async function Results({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: PageProps<"/browse/[slug]">["searchParams"];
}) {
  const { page: pageParam } = await searchParams;
  const movies = getMoviesBySlug(slug);
  const totalPages = Math.max(1, Math.ceil(movies.length / PAGE_SIZE));
  const page = Math.min(
    totalPages,
    Math.max(1, Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1),
  );
  const items = movies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <p className="mt-1 text-sm text-muted">
        {movies.length} кино · {page}/{totalPages} хуудас
      </p>
      <div className="mt-6">
        {items.length ? (
          <MovieGrid movies={items} />
        ) : (
          <p className="py-20 text-center text-sm text-muted">
            Энэ ангилалд одоогоор кино алга байна.
          </p>
        )}
      </div>
      {totalPages > 1 && (
        <nav className="mt-10 flex justify-center gap-2" aria-label="Хуудас">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/browse/${slug}?page=${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                p === page
                  ? "btn-accent"
                  : "border border-line bg-surface text-white/70 hover:text-white"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

async function Content({
  params,
  searchParams,
}: PageProps<"/browse/[slug]">) {
  const { slug } = await params;
  const genre = getGenre(slug);
  if (!genre) notFound();

  return (
    <>
      <h1 className="mt-4 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
        <span className="h-6 w-1 rounded-full bg-accent" />
        {genre.name}
      </h1>
      <Results slug={slug} searchParams={searchParams} />
    </>
  );
}

export default function BrowsePage(props: PageProps<"/browse/[slug]">) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white"
      >
        ← Нүүр
      </Link>
      <Suspense
        fallback={
          <div className="mt-4 animate-pulse">
            <div className="h-9 w-40 rounded bg-white/5" />
            <div className="mt-2 h-4 w-32 rounded bg-white/5" />
          </div>
        }
      >
        <Content {...props} />
      </Suspense>
    </div>
  );
}
