import { notFound } from "next/navigation";
import EditMovieClient from "./EditMovieClient";
import VideoManager from "./VideoManager";
import { assertAdmin } from "@/lib/admin-guard";
import { bunnyConfigured } from "@/lib/bunny";
import { getGenres, rowToMovie, type MovieRow } from "@/lib/data";
import type { Movie } from "@/lib/movies";
import { getAdminClient } from "@/lib/supabase";
import { videoSlots } from "@/lib/videos";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-price/30 bg-price/5 p-5 text-sm leading-relaxed text-white/75">
      {children}
    </div>
  );
}

/** Section 3 of the editor: per-episode videos and subtitles. */
async function Videos({ movie }: { movie: Movie }) {
  if (!bunnyConfigured()) {
    return (
      <Notice>
        <p className="font-semibold text-white">Bunny Stream холбогдоогүй байна</p>
        <p className="mt-2">
          Vercel → Settings → Environment Variables (компьютер дээр{" "}
          <code>.env.local</code>)-д дараах утгуудыг оруулаад дахин deploy хийнэ үү:
        </p>
        <ul className="mt-2 space-y-1 font-mono text-xs">
          <li>BUNNY_STREAM_LIBRARY_ID</li>
          <li>BUNNY_STREAM_API_KEY</li>
          <li>BUNNY_STREAM_TOKEN_KEY</li>
        </ul>
      </Notice>
    );
  }

  const { error } = await getAdminClient()!.from("videos").select("id").limit(1);
  if (error) {
    return (
      <Notice>
        <p className="font-semibold text-white">videos хүснэгт алга</p>
        <p className="mt-2">
          Supabase → SQL Editor дээр <code>supabase/bunny.sql</code>-ийг ажиллуулна уу.
        </p>
      </Notice>
    );
  }

  const isSeries = Boolean(movie.episodes);
  const count = isSeries ? (movie.episodes ?? 0) : 1;
  if (count === 0) {
    return <Notice>Цувралын ангийн тоог оруулж хадгалсны дараа видео нэмнэ.</Notice>;
  }
  return (
    <VideoManager
      movieId={movie.id}
      isSeries={isSeries}
      slots={await videoSlots(movie.id, count)}
      bare
    />
  );
}

/** Loads a movie and renders its editor, as a page or inside the dialog. */
export default async function MovieEditLoader({
  id,
  saved,
  inModal = false,
}: {
  id: string;
  saved?: boolean;
  inModal?: boolean;
}) {
  await assertAdmin();
  const client = getAdminClient();
  if (!client) notFound();

  const { data } = await client.from("movies").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const movie = rowToMovie(data as MovieRow);

  return (
    <EditMovieClient
      movie={movie}
      genres={await getGenres()}
      videoSlot={<Videos movie={movie} />}
      saved={saved}
      inModal={inModal}
    />
  );
}
