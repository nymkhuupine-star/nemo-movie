"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import AdminDialog from "./AdminDialog";
import MovieEditor from "./MovieEditor";
import type { Genre, Movie } from "@/lib/movies";

/** The movie editor in edit mode: inside a dialog, or on its own page. */
export default function EditMovieClient({
  movie,
  genres,
  videoSlot,
  saved: savedInitially = false,
  inModal = false,
}: {
  movie: Movie;
  genres: Genre[];
  videoSlot: React.ReactNode;
  saved?: boolean;
  inModal?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(savedInitially);
  const close = useCallback(
    () => (inModal ? router.back() : router.push("/admin/movies")),
    [inModal, router],
  );

  const notice = saved && (
    <p className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-accent-light">
      Хадгаллаа.
    </p>
  );
  const editor = (
    <MovieEditor
      kind={movie.episodes ? "series" : "movie"}
      genres={genres}
      movie={movie}
      videoSlot={videoSlot}
      onCancel={close}
      onSaved={() => {
        if (inModal) {
          // Back to the list, then reload it so the table shows the changes.
          router.back();
          setTimeout(() => router.refresh(), 100);
        } else {
          setSaved(true);
          router.refresh();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
    />
  );

  if (inModal) {
    return (
      <AdminDialog title="Кино засах" onClose={close}>
        {notice}
        {editor}
      </AdminDialog>
    );
  }
  return (
    <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
      {notice}
      {editor}
    </div>
  );
}
