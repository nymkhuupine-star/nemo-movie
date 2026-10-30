import Hero from "@/components/Hero";
import GenreFilter from "@/components/GenreFilter";
import MovieRow from "@/components/MovieRow";
import { getMovies } from "@/lib/data";
import { filterBySlug } from "@/lib/movies";

const HOME_ROWS = [
  { slug: "trending", title: "Тренд болж буй" },
  { slug: "new", title: "Шинээр нэмэгдсэн" },
  { slug: "action", title: "Action" },
  { slug: "drama", title: "Drama" },
  { slug: "romance", title: "Romance" },
];

export default async function Home() {
  const movies = await getMovies();
  const featured = movies.filter((m) => m.featured || m.trending);
  const heroMovies = featured.length ? featured : movies.slice(0, 8);

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      {heroMovies.length > 0 && <Hero movies={heroMovies} />}
      <GenreFilter movies={movies}>
        {HOME_ROWS.map((row) => (
          <MovieRow
            key={row.slug}
            title={row.title}
            href={`/browse/${row.slug}`}
            movies={filterBySlug(movies, row.slug)}
          />
        ))}
        {movies.length === 0 && (
          <p className="py-24 text-center text-sm text-muted">
            Одоогоор кино нэмэгдээгүй байна.
          </p>
        )}
      </GenreFilter>
    </div>
  );
}
