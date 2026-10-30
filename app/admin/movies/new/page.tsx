import { Suspense } from "react";
import NewMovieButton from "@/components/admin/NewMovieButton";
import { assertAdmin } from "@/lib/admin-guard";
import { getGenres } from "@/lib/data";

async function Flow() {
  await assertAdmin();
  return <NewMovieButton genres={await getGenres()} autoOpen />;
}

export default function NewMoviePage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
      <h1 className="mb-6 text-[28px] font-bold tracking-tight">Кино нэмэх</h1>
      <Suspense fallback={<p className="text-sm text-muted">Ачаалж байна…</p>}>
        <Flow />
      </Suspense>
    </div>
  );
}
