import Link from "next/link";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import MovieForm from "@/components/admin/MovieForm";
import { assertAdmin } from "@/lib/admin-guard";

async function GuardedForm() {
  await assertAdmin();
  return <MovieForm />;
}

export default function NewMoviePage() {
  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          ← Кинонууд
        </Link>
        <h1 className="mt-3 mb-6 text-2xl font-bold tracking-tight">
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
