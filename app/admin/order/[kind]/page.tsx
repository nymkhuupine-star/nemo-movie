import Link from "next/link";
import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import Poster from "@/components/Poster";
import { IconBack } from "@/components/admin/icons";
import { assertAdmin } from "@/lib/admin-guard";
import { adminMovieOptions, type MovieOption } from "@/lib/admin-data";
import type { Movie } from "@/lib/movies";
import { orderAdd, orderMove, orderRemove } from "../../catalog-actions";

const KINDS = {
  featured: {
    title: "Онцлох дараалал",
    description: "Нүүр хуудасны дээд хэсэгт (hero) эргэлдэх кинонууд, энэ дарааллаар.",
    flag: "featured",
    order: "hero_order",
    empty: "Онцлох кино сонгоогүй байна. Одоогоор тренд кинонууд харагдана.",
  },
  trending: {
    title: "Тренд дараалал",
    description: "Нүүр хуудасны “Тренд болж буй” мөрөнд гарах кинонууд, энэ дарааллаар.",
    flag: "trending",
    order: "trend_order",
    empty: "Тренд кино сонгоогүй байна.",
  },
} as const;
type Kind = keyof typeof KINDS;

const asMovie = (m: MovieOption): Movie => ({
  id: m.id,
  title: m.title,
  genre: m.genre,
  year: 0,
  rating: 0,
  price: 0,
  description: "",
  hue: m.hue,
  poster: m.poster_url ?? undefined,
});

function Hidden({ kind, id, extra }: { kind: Kind; id: string; extra?: Record<string, string> }) {
  return (
    <>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="movieId" value={id} />
      {extra &&
        Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
    </>
  );
}

async function OrderEditor({ kind }: { kind: Kind }) {
  await assertAdmin();
  const cfg = KINDS[kind];
  const movies = await adminMovieOptions();
  const chosen = movies
    .filter((m) => m[cfg.flag])
    .sort((a, b) => (a[cfg.order] ?? 1e9) - (b[cfg.order] ?? 1e9));
  const others = movies.filter((m) => !m[cfg.flag]);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {chosen.map((m, i) => (
          <div key={m.id} className="flex items-center gap-4 border-b border-line p-3 last:border-0">
            <span className="w-7 text-center text-sm font-semibold text-white/40">#{i + 1}</span>
            <Poster movie={asMovie(m)} className="h-16 w-11 shrink-0 rounded-md" sizes="44px" />
            <p className="min-w-0 flex-1 truncate font-medium">{m.title}</p>
            {(["up", "down"] as const).map((dir) => (
              <form key={dir} action={orderMove}>
                <Hidden kind={kind} id={m.id} extra={{ dir }} />
                <button
                  disabled={dir === "up" ? i === 0 : i === chosen.length - 1}
                  aria-label={dir === "up" ? "Дээш" : "Доош"}
                  className="h-9 w-9 rounded-lg border border-line text-white/70 hover:bg-white/5 disabled:opacity-30"
                >
                  {dir === "up" ? "↑" : "↓"}
                </button>
              </form>
            ))}
            <form action={orderRemove}>
              <Hidden kind={kind} id={m.id} />
              <button className="h-9 rounded-lg border border-hot/30 px-3 text-sm text-hot hover:bg-hot/10">
                Хасах
              </button>
            </form>
          </div>
        ))}
        {chosen.length === 0 && <p className="p-10 text-center text-sm text-muted">{cfg.empty}</p>}
      </div>

      <form action={orderAdd} className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4">
        <input type="hidden" name="kind" value={kind} />
        <select
          name="movieId"
          required
          defaultValue=""
          className="h-11 min-w-[260px] flex-1 rounded-xl border border-line bg-surface-2 px-3 text-[15px] outline-none"
        >
          <option value="" disabled>
            Нэмэх кино сонгох…
          </option>
          {others.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <button className="btn-accent h-11 rounded-xl px-5 text-[15px] font-semibold">+ Нэмэх</button>
      </form>
    </>
  );
}

async function Page({ params }: { params: PageProps<"/admin/order/[kind]">["params"] }) {
  const { kind } = await params;
  if (!(kind in KINDS)) notFound();
  return <OrderEditor kind={kind as Kind} />;
}

export default function AdminOrderPage({ params }: PageProps<"/admin/order/[kind]">) {
  return (
    <AdminShell
      title="Дараалал"
      description="Онцлох болон тренд кинонуудын дарааллыг тохируулна."
      actions={
        <>
          <Link
            href="/admin/order/featured"
            className="inline-flex h-11 items-center rounded-xl border border-line bg-surface px-4 text-[15px] hover:bg-white/5"
          >
            Онцлох
          </Link>
          <Link
            href="/admin/order/trending"
            className="inline-flex h-11 items-center rounded-xl border border-line bg-surface px-4 text-[15px] hover:bg-white/5"
          >
            Тренд
          </Link>
          <Link
            href="/admin/movies"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-[15px] hover:bg-white/5"
          >
            <IconBack className="h-4 w-4" /> Кино
          </Link>
        </>
      }
    >
      <Page params={params} />
    </AdminShell>
  );
}
