import AdminShell from "@/components/admin/AdminShell";
import Poster from "@/components/Poster";
import { assertAdmin } from "@/lib/admin-guard";
import { adminMovieOptions, type MovieOption } from "@/lib/admin-data";
import type { Movie } from "@/lib/movies";
import { heroAdd, heroMove, heroRemove } from "../catalog-actions";

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

function MoveButton({ id, dir, disabled }: { id: string; dir: "up" | "down"; disabled: boolean }) {
  return (
    <form action={heroMove}>
      <input type="hidden" name="movieId" value={id} />
      <input type="hidden" name="dir" value={dir} />
      <button
        disabled={disabled}
        aria-label={dir === "up" ? "Дээш" : "Доош"}
        className="h-8 w-8 rounded-lg border border-line text-white/70 hover:text-white disabled:opacity-30"
      >
        {dir === "up" ? "↑" : "↓"}
      </button>
    </form>
  );
}

async function HeroEditor() {
  await assertAdmin();
  const movies = await adminMovieOptions();
  const featured = movies
    .filter((m) => m.featured)
    .sort((a, b) => (a.hero_order ?? 1e9) - (b.hero_order ?? 1e9));
  const others = movies.filter((m) => !m.featured);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-line">
        {featured.map((m, i) => (
          <div
            key={m.id}
            className="flex items-center gap-4 border-b border-line bg-surface p-3 last:border-0"
          >
            <span className="w-6 text-center text-sm text-white/40">{i + 1}</span>
            <Poster movie={asMovie(m)} className="h-16 w-11 shrink-0 rounded" sizes="44px" />
            <p className="min-w-0 flex-1 truncate font-medium">{m.title}</p>
            <MoveButton id={m.id} dir="up" disabled={i === 0} />
            <MoveButton id={m.id} dir="down" disabled={i === featured.length - 1} />
            <form action={heroRemove}>
              <input type="hidden" name="movieId" value={m.id} />
              <button className="h-8 rounded-lg border border-hot/30 px-3 text-xs text-hot hover:bg-hot/10">
                Хасах
              </button>
            </form>
          </div>
        ))}
        {featured.length === 0 && (
          <p className="bg-surface p-8 text-center text-sm text-muted">
            Hero-д кино сонгоогүй байна. Одоогоор тренд кинонууд харагдана.
          </p>
        )}
      </div>

      <form action={heroAdd} className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4">
        <select
          name="movieId"
          required
          defaultValue=""
          className="h-10 min-w-[240px] flex-1 rounded-xl border border-line bg-surface-2 px-3 text-sm text-white outline-none"
        >
          <option value="" disabled>
            Hero-д нэмэх кино сонгох…
          </option>
          {others.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <button className="btn-accent h-10 rounded-full px-5 text-sm font-semibold">+ Нэмэх</button>
      </form>
    </>
  );
}

export default function AdminHeroPage() {
  return (
    <AdminShell
      title="Hero баннер"
      description="Нүүр хуудасны дээд хэсэгт эргэлдэх кинонууд, энэ дарааллаар."
    >
      <HeroEditor />
    </AdminShell>
  );
}
