import { cacheLife, cacheTag } from "next/cache";
import { getPublicClient } from "./supabase";
import {
  COLLECTIONS,
  GENRES,
  SAMPLE_MOVIES,
  SAMPLE_PLANS,
  filterByQuery,
  filterBySlug,
  type Genre,
  type Movie,
  type Plan,
  type VideoEdit,
} from "./movies";

export const MOVIES_TAG = "movies";
export const GENRES_TAG = "genres";
export const PLANS_TAG = "plans";

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
  hero_order?: number | null;
  trend_order?: number | null;
  is_hidden?: boolean;
  backdrop_url?: string | null;
  edit?: VideoEdit | null;
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
    vertical: r.edit?.vertical,
    heroOrder: r.hero_order ?? undefined,
    trendOrder: r.trend_order ?? undefined,
    hidden: r.is_hidden ?? false,
    backdrop: r.backdrop_url ?? undefined,
    edit: r.edit ?? undefined,
  };
}

/** Genres in display order. Falls back to the defaults until the table exists. */
export async function getGenres(): Promise<Genre[]> {
  "use cache";
  cacheTag(GENRES_TAG);
  const supabase = getPublicClient();
  if (!supabase) {
    cacheLife("minutes");
    return GENRES;
  }
  const { data, error } = await supabase
    .from("genres")
    .select("slug, name")
    .order("sort")
    .order("name");
  if (error) {
    cacheLife("minutes");
    return GENRES;
  }
  cacheLife("hours");
  return data as Genre[];
}

/** Active plans for the subscription page. */
export async function getPlans(): Promise<Plan[]> {
  "use cache";
  cacheTag(PLANS_TAG);
  const supabase = getPublicClient();
  if (!supabase) {
    cacheLife("minutes");
    return SAMPLE_PLANS;
  }
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("sort")
    .order("price");
  if (error) {
    cacheLife("minutes");
    return SAMPLE_PLANS;
  }
  cacheLife("hours");
  return (data as (Plan & { badge: string | null })[]).map((p) => ({
    ...p,
    badge: p.badge ?? undefined,
  }));
}

/**
 * All movies, newest first. Cached and invalidated by the admin panel via the
 * "movies" tag. Falls back to the sample catalogue while Supabase isn't set up
 * (missing env or missing table) so the site never renders empty by accident.
 */
export async function getMovies(): Promise<Movie[]> {
  "use cache";
  cacheTag(MOVIES_TAG, GENRES_TAG);

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
  const names = new Map((await getGenres()).map((g) => [g.slug, g.name]));
  // Video links are handed out per play by app/play-actions.ts, not with the catalogue.
  // Hidden movies (toggled off in /admin/movies) never reach the site.
  return (data as MovieRow[]).filter((r) => !r.is_hidden).map((r) => ({
    ...rowToMovie(r),
    genreName: names.get(r.genre),
    videoUrl: undefined,
    // Sent with each playback instead (see app/play-actions.ts).
    edit: undefined,
  }));
}

/** Featured movies for the home hero, in the order set in /admin/order/featured. */
export async function getHeroMovies(): Promise<Movie[]> {
  const movies = await getMovies();
  const featured = movies
    .filter((m) => m.featured)
    .sort((a, b) => (a.heroOrder ?? 1e9) - (b.heroOrder ?? 1e9));
  if (featured.length) return featured;
  // Nothing chosen yet: fall back to trending, then the newest.
  const trending = movies.filter((m) => m.trending);
  return trending.length ? trending : movies.slice(0, 8);
}

export async function getMovie(id: string): Promise<Movie | undefined> {
  return (await getMovies()).find((m) => m.id === id);
}

/** A genre or a collection ("trending", "new") by slug. */
export async function getCategory(slug: string): Promise<Genre | undefined> {
  return [...(await getGenres()), ...COLLECTIONS].find((g) => g.slug === slug);
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
