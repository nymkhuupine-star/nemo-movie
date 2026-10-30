"use client";

import { deleteMovie } from "@/app/admin/actions";

export default function DeleteMovieButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  return (
    <form
      action={deleteMovie}
      onSubmit={(e) => {
        if (!confirm(`"${title}"-г устгах уу?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="h-8 rounded-lg border border-hot/30 px-3 text-xs text-hot hover:bg-hot/10"
      >
        Устгах
      </button>
    </form>
  );
}
