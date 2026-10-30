import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import MovieForm from "@/components/admin/MovieForm";
import { assertAdmin } from "@/lib/admin-guard";
import { rowToMovie, type MovieRow } from "@/lib/data";
import { getAdminClient } from "@/lib/supabase";

async function EditForm({
  params,
}: {
  params: PageProps<"/admin/movies/[id]">["params"];
}) {
  await assertAdmin();
  const { id } = await params;
  const client = getAdminClient();
  if (!client) notFound();

  const { data } = await client
    .from("movies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  return <MovieForm movie={rowToMovie(data as MovieRow)} />;
}

export default function EditMoviePage({
  params,
}: PageProps<"/admin/movies/[id]">) {
  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <Link href="/admin" className="text-sm text-white/60 hover:text-white">
          ← Кинонууд
        </Link>
        <h1 className="mt-3 mb-6 text-2xl font-bold tracking-tight">
          Кино засах
        </h1>
        <Suspense
          fallback={<p className="text-sm text-muted">Ачаалж байна…</p>}
        >
          <EditForm params={params} />
        </Suspense>
      </div>
    </>
  );
}
