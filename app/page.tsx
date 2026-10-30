import Hero from "@/components/Hero";
import GenreFilter from "@/components/GenreFilter";
import MovieRow from "@/components/MovieRow";
import { MOVIES, getMoviesBySlug } from "@/lib/movies";

const HOME_ROWS = [
  { slug: "trending", title: "Тренд болж буй" },
  { slug: "new", title: "Шинээр нэмэгдсэн" },
  { slug: "action", title: "Action" },
  { slug: "drama", title: "Drama" },
  { slug: "romance", title: "Romance" },
];

export default function Home() {
  const heroMovies = MOVIES.filter((m) => m.featured || m.trending);

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <Hero movies={heroMovies} />
      <GenreFilter movies={MOVIES}>
        {HOME_ROWS.map((row) => (
          <MovieRow
            key={row.slug}
            title={row.title}
            href={`/browse/${row.slug}`}
            movies={getMoviesBySlug(row.slug)}
          />
        ))}
      </GenreFilter>
    </div>
  );
}
