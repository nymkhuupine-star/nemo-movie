"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import MovieEditor from "./MovieEditor";
import type { Genre, Movie } from "@/lib/movies";

/** The movie editor on its own page (edit mode). */
export default function EditMovieClient({
  movie,
  genres,
  videoSlot,
}: {
  movie: Movie;
  genres: Genre[];
  videoSlot: React.ReactNode;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  return (
    <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
      {saved && (
        <p className="mb-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-accent-light">
          Хадгаллаа.
        </p>
      )}
      <MovieEditor
        kind={movie.episodes ? "series" : "movie"}
        genres={genres}
        movie={movie}
        videoSlot={videoSlot}
        onCancel={() => router.push("/admin/movies")}
        onSaved={() => {
          setSaved(true);
          router.refresh();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
