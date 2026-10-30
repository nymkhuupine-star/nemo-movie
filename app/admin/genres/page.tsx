import AdminShell, { MissingTable, Notice } from "@/components/admin/AdminShell";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { assertAdmin } from "@/lib/admin-guard";
import { getAdminClient } from "@/lib/supabase";
import { deleteGenre, saveGenre } from "../catalog-actions";

const FIELD =
  "h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-white outline-none focus:border-accent/60";

type GenreRow = { slug: string; name: string; sort: number };

async function Genres({ searchParams }: { searchParams: PageProps<"/admin/genres">["searchParams"] }) {
  await assertAdmin();
  const admin = getAdminClient()!;
  const [genresRes, moviesRes, sp] = await Promise.all([
    admin.from("genres").select("*").order("sort").order("name"),
    admin.from("movies").select("genre"),
    searchParams,
  ]);
  if (genresRes.error) return <MissingTable name="genres" />;

  const genres = genresRes.data as GenreRow[];
  const counts = new Map<string, number>();
  for (const m of (moviesRes.data ?? []) as { genre: string }[]) {
    counts.set(m.genre, (counts.get(m.genre) ?? 0) + 1);
  }

  return (
    <>
      <Notice code={sp.notice} />
      <div className="overflow-hidden rounded-2xl border border-line">
        {genres.map((g) => (
          <div
            key={g.slug}
            className="flex flex-wrap items-end gap-3 border-b border-line bg-surface p-4 last:border-0"
          >
            <form action={saveGenre} className="flex flex-1 flex-wrap items-end gap-3">
              <input type="hidden" name="slug" value={g.slug} />
              <label className="min-w-[160px] flex-1">
                <span className="mb-1 block text-xs text-muted">Нэр</span>
                <input name="name" required defaultValue={g.name} className={FIELD} />
              </label>
              <label className="w-24">
                <span className="mb-1 block text-xs text-muted">Дараалал</span>
                <input name="sort" type="number" defaultValue={g.sort} className={FIELD} />
              </label>
              <div className="pb-2 text-xs text-white/50">
                /browse/{g.slug} · {counts.get(g.slug) ?? 0} кино
              </div>
              <button className="btn-accent h-10 rounded-full px-4 text-sm font-semibold">
                Хадгалах
              </button>
            </form>
            <ConfirmSubmit
              action={deleteGenre}
              fields={{ slug: g.slug }}
              confirmText={`"${g.name}" ангиллыг устгах уу?`}
              className="h-10 rounded-full border border-hot/30 px-4 text-sm text-hot hover:bg-hot/10"
            >
              Устгах
            </ConfirmSubmit>
          </div>
        ))}
      </div>

      <form action={saveGenre} className="mt-8 rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-3 font-semibold">Шинэ ангилал</h2>
        <input type="hidden" name="isNew" value="1" />
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[160px] flex-1">
            <span className="mb-1 block text-xs text-muted">Нэр (ж: Түүхэн)</span>
            <input name="name" required className={FIELD} />
          </label>
          <label className="min-w-[160px] flex-1">
            <span className="mb-1 block text-xs text-muted">Slug — латин жижиг үсэг (ж: historical)</span>
            <input name="slug" required pattern="[a-z0-9-]+" className={FIELD} />
          </label>
          <label className="w-24">
            <span className="mb-1 block text-xs text-muted">Дараалал</span>
            <input name="sort" type="number" defaultValue={genres.length + 1} className={FIELD} />
          </label>
          <button className="btn-accent h-10 rounded-full px-5 text-sm font-semibold">+ Нэмэх</button>
        </div>
      </form>
    </>
  );
}

export default function AdminGenresPage({ searchParams }: PageProps<"/admin/genres">) {
  return (
    <AdminShell
      title="Ангилал"
      description="Цэс, нүүр хуудасны chip, кино нэмэх формд харагдах ангиллууд."
    >
      <Genres searchParams={searchParams} />
    </AdminShell>
  );
}
