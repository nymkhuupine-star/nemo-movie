import { cacheLife, cacheTag } from "next/cache";
import { getPublicClient } from "./supabase";
import { SAMPLE_MOVIES, filterByQuery, filterBySlug, type Movie } from "./movies";

export const MOVIES_TAG = "movies";

export type MovieRow = {
  id: string;
  title: string;
  genre: string;
  year: number;
  rating: number | string;
  price: number;
  duration: number | null;
  episodes: number | null;
  is_new: boolean;
  featured: boolean;
  trending: boolean;
  description: string;
  poster_url: string | null;
  video_url: string | null;
  hue: number;
  created_at: string;
};

export function rowToMovie(r: MovieRow): Movie {
  return {
    id: r.id,
    title: r.title,
    genre: r.genre,
    year: r.year,
    rating: Number(r.rating),
    price: r.price,
    duration: r.duration ?? undefined,
    episodes: r.episodes ?? undefined,
    isNew: r.is_new,
    featured: r.featured,
    trending: r.trending,
    description: r.description,
    poster: r.poster_url ?? undefined,
    videoUrl: r.video_url ?? undefined,
    hue: r.hue,
  };
}

/**
 * All movies, newest first. Cached and invalidated by the admin panel via the
 * "movies" tag. Falls back to the sample catalogue while Supabase isn't set up
 * (missing env or missing table) so the site never renders empty by accident.
 */
export async function getMovies(): Promise<Movie[]> {
  "use cache";
  cacheTag(MOVIES_TAG);

  const supabase = getPublicClient();
  if (!supabase) {
    cacheLife("minutes");
    return SAMPLE_MOVIES;
  }

  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // Don't keep the fallback around for long: retry soon.
    console.error("[supabase] failed to load movies:", error.message);
    cacheLife("minutes");
    return SAMPLE_MOVIES;
  }
  cacheLife("hours");
  // Video links are handed out per play by app/play-actions.ts, not with the catalogue.
  return (data as MovieRow[]).map((r) => ({
    ...rowToMovie(r),
    videoUrl: undefined,
  }));
}

export async function getMovie(id: string): Promise<Movie | undefined> {
  return (await getMovies()).find((m) => m.id === id);
}

export async function getMoviesBySlug(slug: string): Promise<Movie[]> {
  return filterBySlug(await getMovies(), slug);
}

export async function searchMovies(query: string): Promise<Movie[]> {
  return filterByQuery(await getMovies(), query);
}

/** Params for generateStaticParams; Cache Components needs at least one. */
export async function movieIdParams(): Promise<{ id: string }[]> {
  const ids = (await getMovies()).map((m) => ({ id: m.id }));
  return ids.length ? ids : [{ id: "__placeholder__" }];
}
