import Link from "next/link";
import { Suspense } from "react";
import MovieEditLoader from "@/components/admin/MovieEditLoader";

type Props = PageProps<"/admin/movies/[id]">;

async function Editor({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <MovieEditLoader id={id} saved={Boolean(sp.saved)} />;
}

/** Full-page editor (direct visits / refresh); clicks from the list open a dialog. */
export default function EditMoviePage(props: Props) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
      <Link href="/admin/movies" className="text-sm text-white/60 hover:text-white">
        ← Кино
      </Link>
      <h1 className="mt-3 mb-6 text-[28px] font-bold tracking-tight">Кино засах</h1>
      <Suspense fallback={<p className="text-sm text-muted">Ачаалж байна…</p>}>
        <Editor {...props} />
      </Suspense>
    </div>
  );
}
