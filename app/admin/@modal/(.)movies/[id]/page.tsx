import { Suspense } from "react";
import MovieEditLoader from "@/components/admin/MovieEditLoader";

type Props = PageProps<"/admin/movies/[id]">;

async function Editor({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <MovieEditLoader id={id} saved={Boolean(sp.saved)} inModal />;
}

/** Clicking a movie in the list opens its editor as a dialog over the list. */
export default function EditMovieDialog(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,12,25,0.45)] backdrop-blur-sm">
          <p className="rounded-2xl bg-surface px-6 py-4 text-sm text-muted shadow-xl">
            Ачаалж байна…
          </p>
        </div>
      }
    >
      <Editor {...props} />
    </Suspense>
  );
}
