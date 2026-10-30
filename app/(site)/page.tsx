import Hero from "@/components/Hero";
import GenreFilter from "@/components/GenreFilter";
import MovieRow from "@/components/MovieRow";
import { getGenres, getHeroMovies, getMovies } from "@/lib/data";
import { filterBySlug } from "@/lib/movies";

const COLLECTION_ROWS = [
  { slug: "trending", title: "Тренд болж буй" },
  { slug: "new", title: "Шинээр нэмэгдсэн" },
];
// Genre rows shown under the collections (first ones that have movies).
const GENRE_ROWS = 3;

export default async function Home() {
  const [movies, heroMovies, genres] = await Promise.all([
    getMovies(),
    getHeroMovies(),
    getGenres(),
  ]);
  const rows = [
    ...COLLECTION_ROWS,
    ...genres
      .filter((g) => movies.some((m) => m.genre === g.slug))
      .slice(0, GENRE_ROWS)
      .map((g) => ({ slug: g.slug, title: g.name })),
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      {heroMovies.length > 0 && <Hero movies={heroMovies} />}
      <GenreFilter movies={movies} genres={genres}>
        {rows.map((row) => (
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
