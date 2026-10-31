import Link from "next/link";
import { Suspense } from "react";
import { MissingTable } from "@/components/admin/AdminShell";
import RevenueOverview from "@/components/admin/RevenueOverview";
import { adminPaidPayments } from "@/lib/admin-data";
import { assertAdmin } from "@/lib/admin-guard";
import { activeEntitlementsByUser, formatDate, listAllUsers } from "@/lib/admin-users";
import { getAdminClient } from "@/lib/supabase";

const DAY = 24 * 60 * 60 * 1000;

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

function Card({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="text-xs text-accent-light hover:underline">
            Бүгдийг харах →
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Everything the dashboard shows, computed outside render. */
async function loadDashboard() {
  const admin = getAdminClient()!;
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const [moviesRes, videosRes, playsRes, users, entitlements] = await Promise.all([
    admin.from("movies").select("id, title, episodes"),
    admin.from("videos").select("id", { count: "exact", head: true }),
    admin.from("play_events").select("movie_id, created_at").gte("created_at", since30),
    listAllUsers(),
    activeEntitlementsByUser(),
  ]);

  const movies = (moviesRes.data ?? []) as { id: string; title: string; episodes: number | null }[];
  const titles = new Map(movies.map((m) => [m.id, m.title]));
  const plays = (playsRes.data ?? []) as { movie_id: string; created_at: string }[];
  const week = Date.now() - 7 * DAY;

  const subscribers = [...entitlements.values()].filter((list) =>
    list.some((e) => e.kind === "subscription"),
  ).length;
  const newUsers = users.filter((u) => new Date(u.created_at).getTime() > week).length;
  const plays7 = plays.filter((p) => new Date(p.created_at).getTime() > week).length;

  const counts = new Map<string, number>();
  for (const p of plays) counts.set(p.movie_id, (counts.get(p.movie_id) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const missing = [
    playsRes.error && "play_events",
    videosRes.error && "videos",
  ].filter(Boolean);

  return { movies, titles, plays, users, entitlements, subscribers, newUsers, plays7, top, missing, videoCount: videosRes.count ?? 0 };
}

async function Dashboard() {
  await assertAdmin();
  if (!getAdminClient()) {
    return <p className="text-sm text-hot">Supabase тохируулаагүй байна.</p>;
  }
  const [{ movies, titles, plays, users, entitlements, subscribers, newUsers, plays7, top, missing, videoCount }, payments] =
    await Promise.all([loadDashboard(), adminPaidPayments()]);

  return (
    <>
      {!payments && <MissingTable name="payments хүснэгт" file="payments.sql" />}
      <RevenueOverview payments={payments ?? []} />

      <div className="mt-6" />
      {missing.length > 0 && (
        <p className="mb-5 rounded-xl border border-price/30 bg-price/5 px-4 py-2.5 text-sm text-white/75">
          Зарим хүснэгт алга ({missing.join(", ")}). Supabase SQL Editor дээр{" "}
          <code>supabase/admin.sql</code>-ийг ажиллуулна уу.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Хэрэглэгч" value={users.length} hint={`+${newUsers} энэ 7 хоногт`} />
        <Stat label="Идэвхтэй гишүүнчлэл" value={subscribers} />
        <Stat label="Үзэлт (7 хоног)" value={plays7} hint={`${plays.length} — 30 хоногт`} />
        <Stat
          label="Кино / цуврал"
          value={`${movies.filter((m) => !m.episodes).length} / ${movies.filter((m) => m.episodes).length}`}
          hint={`${videoCount} видео upload хийсэн`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Хамгийн их үзсэн (30 хоног)" href="/admin/movies">
          {top.length ? (
            <ol className="space-y-2 text-sm">
              {top.map(([id, n], i) => (
                <li key={id} className="flex items-center justify-between gap-3">
                  <Link href={`/admin/movies/${id}`} className="truncate hover:text-accent-light">
                    <span className="mr-2 text-white/40">{i + 1}.</span>
                    {titles.get(id) ?? "Устгагдсан кино"}
                  </Link>
                  <span className="shrink-0 text-white/60">{n} үзэлт</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Одоогоор үзэлт алга.</p>
          )}
        </Card>

        <Card title="Шинэ хэрэглэгчид" href="/admin/users">
          {users.length ? (
            <ul className="space-y-2 text-sm">
              {users.slice(0, 6).map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3">
                  <Link href={`/admin/users/${u.id}`} className="truncate hover:text-accent-light">
                    {u.email}
                  </Link>
                  <span className="shrink-0 text-xs text-white/50">
                    {entitlements.get(u.id)?.some((e) => e.kind === "subscription") && (
                      <span className="mr-2 rounded bg-accent/15 px-1.5 py-0.5 text-accent-light">
                        Гишүүн
                      </span>
                    )}
                    {formatDate(u.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Одоогоор хэрэглэгч алга.</p>
          )}
        </Card>
      </div>
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <Suspense fallback={<p className="text-sm text-muted">Ачаалж байна…</p>}>
          <Dashboard />
        </Suspense>
      </div>
    </>
  );
}
