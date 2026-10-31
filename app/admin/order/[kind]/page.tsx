import Link from "next/link";
import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import OrderList from "@/components/admin/OrderList";
import { IconBack } from "@/components/admin/icons";
import { assertAdmin } from "@/lib/admin-guard";
import { adminMovieOptions, type MovieOption } from "@/lib/admin-data";
import type { Movie } from "@/lib/movies";
import { orderAdd } from "../../catalog-actions";

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
      {chosen.length > 0 ? (
        // Starts over only when movies are added or removed; a save keeps the list as moved.
        <OrderList
          key={chosen.map((m) => m.id).sort().join()}
          kind={kind}
          movies={chosen.map(asMovie)}
        />
      ) : (
        <p className="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-muted">
          {cfg.empty}
        </p>
      )}

      <form action={orderAdd} className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4">
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
