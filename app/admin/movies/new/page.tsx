import Link from "next/link";
import { Suspense } from "react";
import MovieForm from "@/components/admin/MovieForm";
import { assertAdmin } from "@/lib/admin-guard";
import { getGenres } from "@/lib/data";

async function GuardedForm() {
  await assertAdmin();
  return <MovieForm genres={await getGenres()} />;
}

export default function NewMoviePage() {
  return (
    <>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <Link href="/admin/movies" className="text-sm text-white/60 hover:text-white">
          ← Кинонууд
        </Link>
        <h1 className="mt-3 mb-6 text-[28px] font-bold tracking-tight">
          Шинэ кино нэмэх
        </h1>
        <Suspense
          fallback={<p className="text-sm text-muted">Ачаалж байна…</p>}
        >
          <GuardedForm />
        </Suspense>
      </div>
    </>
  );
}
