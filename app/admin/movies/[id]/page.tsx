import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import MovieForm from "@/components/admin/MovieForm";
import VideoManager from "@/components/admin/VideoManager";
import { assertAdmin } from "@/lib/admin-guard";
import { bunnyConfigured } from "@/lib/bunny";
import { getGenres, rowToMovie, type MovieRow } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase";
import { videoSlots } from "@/lib/videos";

type Props = PageProps<"/admin/movies/[id]">;

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-price/30 bg-price/5 p-5 text-sm leading-relaxed text-white/75">
      {children}
    </div>
  );
}

async function Videos({ movie }: { movie: ReturnType<typeof rowToMovie> }) {
  if (!bunnyConfigured()) {
    return (
      <Notice>
        <p className="font-semibold text-white">Bunny Stream холбогдоогүй байна</p>
        <p className="mt-2">
          <code>.env.local</code> файлд дараах утгуудыг оруулаад dev server-ээ
          дахин асаана уу (Bunny → Stream → таны library → API):
        </p>
        <ul className="mt-2 space-y-1 font-mono text-xs">
          <li>BUNNY_STREAM_LIBRARY_ID</li>
          <li>BUNNY_STREAM_API_KEY</li>
          <li>BUNNY_STREAM_TOKEN_KEY (Security → Token authentication key)</li>
        </ul>
      </Notice>
    );
  }

  const { error } = await getAdminClient()!
    .from("videos")
    .select("id")
    .limit(1);
  if (error) {
    return (
      <Notice>
        <p className="font-semibold text-white">videos хүснэгт алга</p>
        <p className="mt-2">
          Supabase → SQL Editor дээр төслийн <code>supabase/bunny.sql</code>{" "}
          файлыг ажиллуулна уу.
        </p>
      </Notice>
    );
  }

  const isSeries = Boolean(movie.episodes);
  const count = isSeries ? (movie.episodes ?? 0) : 1;
  if (count === 0) {
    return (
      <Notice>Цувралын ангийн тоог оруулж хадгалсны дараа видео нэмнэ.</Notice>
    );
  }
  return (
    <VideoManager
      movieId={movie.id}
      isSeries={isSeries}
      slots={await videoSlots(movie.id, count)}
    />
  );
}

async function Editor({ params, searchParams }: Props) {
  await assertAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const client = getAdminClient();
  if (!client) notFound();

  const { data } = await client
    .from("movies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const movie = rowToMovie(data as MovieRow);

  return (
    <>
      {sp.saved && (
        <p className="mb-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-accent-light">
          Хадгаллаа.
        </p>
      )}
      <MovieForm movie={movie} genres={await getGenres()} />
      <section id="videos" className="mt-12 scroll-mt-8">
        <h2 className="mb-1 text-xl font-bold tracking-tight">Видео</h2>
        <p className="mb-4 text-sm text-muted">
          Видео шууд Bunny Stream руу upload хийгдэнэ. Encode дуусахад
          (&quot;Бэлэн&quot;) сайт дээр тоглоно.
        </p>
        <Videos movie={movie} />
      </section>
    </>
  );
}

export default function EditMoviePage(props: Props) {
  return (
    <>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <Link href="/admin/movies" className="text-sm text-white/60 hover:text-white">
          ← Кинонууд
        </Link>
        <h1 className="mt-3 mb-6 text-[28px] font-bold tracking-tight">
          Кино засах
        </h1>
        <Suspense
          fallback={<p className="text-sm text-muted">Ачаалж байна…</p>}
        >
          <Editor {...props} />
        </Suspense>
      </div>
    </>
  );
}
