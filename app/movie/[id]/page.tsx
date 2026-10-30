import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import MovieDetail, { MovieDetailSkeleton } from "@/components/MovieDetail";
import MovieRow from "@/components/MovieRow";
import { MOVIES, getGenreName, getMovie } from "@/lib/movies";

type Params = PageProps<"/movie/[id]">["params"];

export function generateStaticParams() {
  return MOVIES.map((m) => ({ id: m.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/movie/[id]">): Promise<Metadata> {
  const { id } = await params;
  const movie = getMovie(id);
  return movie
    ? { title: movie.title, description: movie.description }
    : { title: "Олдсонгүй" };
}

async function Content({ params }: { params: Params }) {
  const { id } = await params;
  const movie = getMovie(id);
  if (!movie) notFound();

  const related = MOVIES.filter(
    (m) => m.genre === movie.genre && m.id !== movie.id,
  );

  return (
    <>
      <div className="mx-auto mt-4 max-w-[640px] overflow-hidden rounded-2xl border border-line bg-[#0e0e0e]">
        <MovieDetail movie={movie} />
      </div>
      <MovieRow
        title={`Төстэй: ${getGenreName(movie.genre)}`}
        href={`/browse/${movie.genre}`}
        movies={related}
      />
    </>
  );
}

export default function MoviePage({ params }: PageProps<"/movie/[id]">) {
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
          <div className="mx-auto mt-4 max-w-[640px] overflow-hidden rounded-2xl border border-line bg-[#0e0e0e]">
            <MovieDetailSkeleton />
          </div>
        }
      >
        <Content params={params} />
      </Suspense>
    </div>
  );
}
