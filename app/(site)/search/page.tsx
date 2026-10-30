import type { Metadata } from "next";
import { Suspense } from "react";
import { MovieGrid } from "@/components/MovieRow";
import { searchMovies } from "@/lib/data";

export const metadata: Metadata = { title: "Хайлт" };

async function Results({
  searchParams,
}: {
  searchParams: PageProps<"/search">["searchParams"];
}) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q) ?? "";
  const results = await searchMovies(query);

  return (
    <>
      <h1 className="mt-8 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
        <span className="h-6 w-1 rounded-full bg-accent" />
        {query ? `“${query}”` : "Хайлт"}
      </h1>
      <p className="mt-1 text-sm text-muted">{results.length} үр дүн</p>
      <div className="mt-6">
        {results.length ? (
          <MovieGrid movies={results} />
        ) : (
          <p className="py-20 text-center text-sm text-muted">
            {query
              ? "Таны хайлтад тохирох кино олдсонгүй."
              : "Хайх үгээ дээрх хайлтын талбарт оруулна уу."}
          </p>
        )}
      </div>
    </>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <Suspense
        fallback={<p className="mt-8 text-sm text-muted">Хайж байна…</p>}
      >
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
