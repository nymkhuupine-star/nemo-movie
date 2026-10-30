"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Poster from "@/components/Poster";
import { deleteMovie } from "@/app/admin/actions";
import { setMovieHidden } from "@/app/admin/catalog-actions";
import { formatDuration, genreLabel, type Genre, type Movie } from "@/lib/movies";
import {
  IconDots,
  IconPencil,
  IconScissors,
  IconSearch,
  IconSort,
  IconSparkle,
  IconStar,
  IconTrend,
} from "./icons";

export type MovieTableRow = Movie & { featuredRank?: number; trendRank?: number };

type Tab = "all" | "visible" | "hidden";
type SortKey = "title" | "year" | "rating" | null;

function Toggle({
  on,
  disabled,
  onChange,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className="flex items-center gap-2.5 disabled:opacity-50"
    >
      <span
        className={`relative h-6 w-10 rounded-full transition-colors ${
          on ? "bg-emerald-500" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-black shadow transition-all ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      <span className={`text-sm ${on ? "text-emerald-600" : "text-muted"}`}>
        {on ? "Харагдана" : "Нуусан"}
      </span>
    </button>
  );
}

function RowMenu({ movie }: { movie: MovieTableRow }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) =>
      !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Бусад"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-2 text-white/70 hover:bg-white/5 hover:text-white"
      >
        <IconDots />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 w-48 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          <Link
            href={`/movie/${movie.id}`}
            target="_blank"
            className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            Сайт дээр харах ↗
          </Link>
          <form
            action={deleteMovie}
            onSubmit={(e) => {
              if (!confirm(`"${movie.title}"-г устгах уу? Видеонууд нь хамт устна.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={movie.id} />
            <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-hot hover:bg-hot/10">
              Устгах
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function MoviesTable({
  rows,
  genres,
}: {
  rows: MovieTableRow[];
  genres: Genre[];
}) {
  const [hidden, setHidden] = useState(
    () => new Map(rows.map((r) => [r.id, Boolean(r.hidden)])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: null, dir: 1 });
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses the search box, like the reference admin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const counts = {
    all: rows.length,
    visible: rows.filter((r) => !hidden.get(r.id)).length,
    hidden: rows.filter((r) => hidden.get(r.id)).length,
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (tab === "all" || (tab === "hidden") === Boolean(hidden.get(r.id))) &&
        (!genre || r.genre === genre) &&
        (!q || r.title.toLowerCase().includes(q)),
    );
    if (sort.key) {
      const k = sort.key;
      list.sort((a, b) =>
        k === "title"
          ? a.title.localeCompare(b.title) * sort.dir
          : ((a[k] as number) - (b[k] as number)) * sort.dir,
      );
    }
    return list;
  }, [rows, hidden, tab, genre, query, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "title" ? 1 : -1 }));

  const flip = async (id: string) => {
    const next = !hidden.get(id);
    setError("");
    setBusy(id);
    setHidden((m) => new Map(m).set(id, next));
    const res = await setMovieHidden(id, next);
    if (!res.ok) {
      setHidden((m) => new Map(m).set(id, !next));
      setError(res.error ?? "Алдаа гарлаа.");
    }
    setBusy(null);
  };

  const th = (label: string, key?: SortKey) => (
    <th className="px-4 py-3.5 font-medium">
      {key ? (
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className="inline-flex items-center gap-1 hover:text-white"
        >
          {label}
          <IconSort className={`h-3.5 w-3.5 ${sort.key === key ? "text-accent-light" : ""}`} />
        </button>
      ) : (
        label
      )}
    </th>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <div className="flex rounded-xl bg-surface-2 p-1">
          {(
            [
              ["all", "Бүгд"],
              ["visible", "Харагдаж буй"],
              ["hidden", "Нуусан"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[15px] transition-colors ${
                tab === key ? "bg-surface font-semibold shadow-sm" : "text-white/60 hover:text-white"
              }`}
            >
              {label}
              <span className="rounded-full bg-white/10 px-2 text-xs text-white/60">
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap gap-3">
          <label className="flex h-11 w-72 items-center gap-2 rounded-xl border border-line px-3.5 focus-within:border-accent/60">
            <IconSearch className="h-4.5 w-4.5 text-white/40" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Нэрээр хайх…"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-white/40"
            />
            <kbd className="rounded border border-line px-1.5 text-xs text-white/40">/</kbd>
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="h-11 w-48 rounded-xl border border-line bg-surface px-3.5 text-[15px] outline-none"
          >
            <option value="">Бүх төрөл</option>
            {genres.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="border-b border-line bg-hot/10 px-4 py-2.5 text-sm text-hot">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-[15px]">
          <thead className="bg-surface-2/60 text-sm text-muted">
            <tr>
              {th("Кино", "title")}
              {th("Төрөл")}
              {th("Он", "year")}
              {th("Үнэлгээ", "rating")}
              {th("Нүүр хуудас")}
              {th("Сайт дээр")}
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((m) => (
              <tr key={m.id} className="hover:bg-white/[.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Poster movie={m} className="h-[70px] w-[50px] shrink-0 rounded-md" sizes="50px" />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/movies/${m.id}`}
                        className="block max-w-[320px] truncate font-semibold hover:text-accent-light"
                      >
                        {m.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted">
                        {m.episodes
                          ? `${m.episodes} анги`
                          : m.duration
                            ? formatDuration(m.duration)
                            : "—"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/70">{genreLabel(m)}</td>
                <td className="px-4 py-3 text-white/70">{m.year}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <IconStar className="h-4 w-4 text-amber-600" />
                    {m.rating.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {m.featuredRank && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-light">
                        <IconSparkle className="h-3.5 w-3.5" /> Онцлох #{m.featuredRank}
                      </span>
                    )}
                    {m.trendRank && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                        <IconTrend className="h-3.5 w-3.5" /> Тренд #{m.trendRank}
                      </span>
                    )}
                    {!m.featuredRank && !m.trendRank && <span className="text-white/30">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Toggle on={!hidden.get(m.id)} disabled={busy === m.id} onChange={() => flip(m.id)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/movies/${m.id}`}
                      aria-label="Засах"
                      title="Засах"
                      className="rounded-lg p-2 text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      <IconPencil />
                    </Link>
                    <Link
                      href={`/admin/movies/${m.id}#videos`}
                      aria-label="Видео, ангиуд"
                      title="Видео, ангиуд"
                      className="rounded-lg p-2 text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      <IconScissors />
                    </Link>
                    <RowMenu movie={m} />
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  Тохирох кино олдсонгүй.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
