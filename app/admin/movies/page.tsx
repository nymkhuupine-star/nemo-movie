import Link from "next/link";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import DeleteMovieButton from "@/components/admin/DeleteMovieButton";
import Poster from "@/components/Poster";
import { seedSampleMovies } from "../actions";
import { assertAdmin } from "@/lib/admin-guard";
import { getGenres, rowToMovie, type MovieRow } from "@/lib/data";
import { formatPrice, genreLabel } from "@/lib/movies";
import { getAdminClient, supabaseStatus } from "@/lib/supabase";

const NOTICES: Record<string, string> = {
  saved: "Хадгаллаа.",
  deleted: "Устгалаа.",
  seeded: "Жишээ кинонуудыг нэмлээ.",
};

function SetupCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-price/30 bg-price/5 p-5 text-sm leading-relaxed text-white/75">
      {children}
    </div>
  );
}

async function Dashboard({
  searchParams,
}: {
  searchParams: PageProps<"/admin/movies">["searchParams"];
}) {
  await assertAdmin();
  const params = await searchParams;
  const notice = Object.keys(NOTICES).find((k) => params[k]);

  const status = supabaseStatus();
  const client = getAdminClient();
  if (!client) {
    return (
      <SetupCard>
        <p className="font-semibold text-white">Supabase холбогдоогүй байна</p>
        <p className="mt-2">
          Төслийн хавтасны <code>.env.local</code> файлд дараах түлхүүрүүдийг
          оруулаад dev server-ээ дахин асаана уу:
        </p>
        <ul className="mt-2 space-y-1 font-mono text-xs">
          <li>{status.url ? "✓" : "✗"} NEXT_PUBLIC_SUPABASE_URL</li>
          <li>{status.anonKey ? "✓" : "✗"} NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          <li>{status.serviceKey ? "✓" : "✗"} SUPABASE_SERVICE_ROLE_KEY</li>
        </ul>
      </SetupCard>
    );
  }

  const { data, error } = await client
    .from("movies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <SetupCard>
        <p className="font-semibold text-white">movies хүснэгт олдсонгүй</p>
        <p className="mt-2">
          Supabase → SQL Editor → New query дээр төслийн{" "}
          <code>supabase/schema.sql</code> файлын агуулгыг хуулж Run дарна уу.
          Дараа нь энэ хуудсыг дахин ачаална.
        </p>
        <p className="mt-2 font-mono text-xs text-white/50">{error.message}</p>
      </SetupCard>
    );
  }

  const names = new Map((await getGenres()).map((g) => [g.slug, g.name]));
  const movies = (data as MovieRow[]).map((r) => ({
    ...rowToMovie(r),
    genreName: names.get(r.genre),
  }));
  const stats = [
    { label: "Нийт", value: movies.length },
    { label: "Кино", value: movies.filter((m) => !m.episodes).length },
    { label: "Цуврал", value: movies.filter((m) => m.episodes).length },
    { label: "Онцлох", value: movies.filter((m) => m.featured).length },
  ];

  return (
    <>
      {notice && (
        <p className="mb-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-accent-light">
          {NOTICES[notice]}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {movies.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-10 text-center">
          <p className="text-white/70">Одоогоор кино алга байна.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/admin/movies/new"
              className="btn-accent inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold"
            >
              + Шинэ кино
            </Link>
            <form action={seedSampleMovies}>
              <button
                type="submit"
                className="h-10 rounded-full border border-line px-5 text-sm text-white/80 hover:text-white"
              >
                40 жишээ кино оруулах
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Кино</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Төрөл</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Үнэлгээ</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Үнэ</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Шошго</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {movies.map((m) => (
                <tr key={m.id} className="hover:bg-white/[.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Poster
                        movie={m}
                        className="h-14 w-10 shrink-0 rounded"
                        sizes="40px"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.title}</p>
                        <p className="text-xs text-muted">
                          {m.year} ·{" "}
                          {m.episodes ? `${m.episodes} анги` : "Кино"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-white/70 md:table-cell">
                    {genreLabel(m)}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    ★ {m.rating.toFixed(1)}
                  </td>
                  <td className="hidden px-4 py-3 text-white/70 md:table-cell">
                    {formatPrice(m.price)}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex gap-1">
                      {m.isNew && <Tag>Шинэ</Tag>}
                      {m.featured && <Tag>Онцлох</Tag>}
                      {m.trending && <Tag>Тренд</Tag>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/movies/${m.id}`}
                        className="h-8 rounded-lg border border-line px-3 text-xs leading-8 text-white/80 hover:text-white"
                      >
                        Засах
                      </Link>
                      <DeleteMovieButton id={m.id} title={m.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-white/70">
      {children}
    </span>
  );
}

export default function AdminMoviesPage({ searchParams }: PageProps<"/admin/movies">) {
  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Кинонууд</h1>
          <Link
            href="/admin/movies/new"
            className="btn-accent inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold"
          >
            + Шинэ кино
          </Link>
        </div>
        <Suspense
          fallback={<p className="text-sm text-muted">Ачаалж байна…</p>}
        >
          <Dashboard searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
