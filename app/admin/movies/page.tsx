import Link from "next/link";
import AdminShell, { MissingTable } from "@/components/admin/AdminShell";
import MoviesTable, { type MovieTableRow } from "@/components/admin/MoviesTable";
import { Suspense } from "react";
import NewMovieButton from "@/components/admin/NewMovieButton";
import { IconSparkle, IconTrend } from "@/components/admin/icons";
import { assertAdmin } from "@/lib/admin-guard";
import { getGenres, rowToMovie, type MovieRow } from "@/lib/data";
import { getAdminClient, supabaseStatus } from "@/lib/supabase";
import { seedSampleMovies } from "../actions";

const NOTICES: Record<string, string> = {
  deleted: "Кино устгагдлаа.",
  seeded: "Жишээ кинонуудыг нэмлээ.",
};

/** 1-based position among movies with the flag, by their order column. */
function ranks(rows: MovieRow[], flag: "featured" | "trending", col: "hero_order" | "trend_order") {
  return new Map(
    rows
      .filter((r) => r[flag])
      .sort((a, b) => (a[col] ?? 1e9) - (b[col] ?? 1e9))
      .map((r, i) => [r.id, i + 1]),
  );
}

async function Movies({
  searchParams,
}: {
  searchParams: PageProps<"/admin/movies">["searchParams"];
}) {
  await assertAdmin();
  const sp = await searchParams;
  const notice = Object.keys(NOTICES).find((k) => sp[k]);

  const client = getAdminClient();
  if (!client) {
    const s = supabaseStatus();
    return (
      <p className="rounded-2xl border border-price/30 bg-price/5 p-5 text-sm text-white/75">
        Supabase холбогдоогүй байна ({s.url ? "" : "URL "}
        {s.serviceKey ? "" : "SERVICE_ROLE_KEY"} дутуу).
      </p>
    );
  }

  const [{ data, error }, genres] = await Promise.all([
    client.from("movies").select("*").order("created_at", { ascending: false }),
    getGenres(),
  ]);
  if (error) return <MissingTable name="movies хүснэгт" file="schema.sql" />;

  const raw = data as MovieRow[];
  const names = new Map(genres.map((g) => [g.slug, g.name]));
  const featuredRank = ranks(raw, "featured", "hero_order");
  const trendRank = ranks(raw, "trending", "trend_order");
  const hasHiddenColumn = raw.length === 0 || "is_hidden" in raw[0];

  const rows: MovieTableRow[] = raw.map((r) => ({
    ...rowToMovie(r),
    genreName: names.get(r.genre),
    featuredRank: featuredRank.get(r.id),
    trendRank: trendRank.get(r.id),
  }));

  return (
    <>
      {notice && (
        <p className="mb-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-accent-light">
          {NOTICES[notice]}
        </p>
      )}
      {!hasHiddenColumn && (
        <MissingTable name="is_hidden / trend_order багана" file="admin2.sql" />
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center">
          <p className="text-white/70">Одоогоор кино алга байна.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <NewMovieButton genres={genres} />
            <form action={seedSampleMovies}>
              <button className="h-10 rounded-xl border border-line px-5 text-sm text-white/80 hover:text-white">
                40 жишээ кино оруулах
              </button>
            </form>
          </div>
        </div>
      ) : (
        <MoviesTable rows={rows} genres={genres} />
      )}
    </>
  );
}

async function NewMovie() {
  return <NewMovieButton genres={await getGenres()} />;
}

const BUTTON =
  "inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-[15px] font-medium text-white/90 hover:bg-white/5";

export default function AdminMoviesPage({ searchParams }: PageProps<"/admin/movies">) {
  return (
    <AdminShell
      title="Кино"
      description="Кино нэмэх, засах, устгах. Өөрчлөлт шууд сайт дээр харагдана."
      actions={
        <>
          <Link href="/admin/order/featured" className={BUTTON}>
            <IconSparkle className="h-5 w-5" /> Онцлох дараалал
          </Link>
          <Link href="/admin/order/trending" className={BUTTON}>
            <IconTrend className="h-5 w-5" /> Тренд дараалал
          </Link>
          <Suspense fallback={null}>
            <NewMovie />
          </Suspense>
        </>
      }
    >
      <Movies searchParams={searchParams} />
    </AdminShell>
  );
}
