"use client";

import { useRef, useState, useTransition } from "react";
import Poster from "@/components/Poster";
import { orderRemove, saveOrder } from "@/app/admin/catalog-actions";
import type { Movie } from "@/lib/movies";

/**
 * Featured/trending list. An arrow moves the row at once and saves in the
 * background, so a slow save can't look like nothing happened; a failed save
 * puts the row back and says so.
 */
export default function OrderList({
  kind,
  movies,
}: {
  kind: "featured" | "trending";
  movies: Movie[];
}) {
  const [list, setList] = useState(movies);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const saved = useRef(movies);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...list];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    setList(next);
    setError("");
    startSaving(async () => {
      let message: string;
      try {
        const res = await saveOrder(kind, next.map((m) => m.id));
        if (res.ok) {
          saved.current = next;
          return;
        }
        message = res.error;
      } catch {
        // Usually a tab left open across a new deploy.
        message = "Хадгалж чадсангүй. Хуудсаа дахин ачаалаад оролдоно уу.";
      }
      setList(saved.current);
      setError(message);
    });
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {list.map((m, i) => (
          <div key={m.id} className="flex items-center gap-4 border-b border-line p-3 last:border-0">
            <span className="w-7 text-center text-sm font-semibold text-white/40">#{i + 1}</span>
            <Poster movie={m} className="h-16 w-11 shrink-0 rounded-md" sizes="44px" />
            <p className="min-w-0 flex-1 truncate font-medium">{m.title}</p>
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`${m.title} дээш`}
              className="h-9 w-9 rounded-lg border border-line text-white/70 hover:bg-white/5 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === list.length - 1}
              aria-label={`${m.title} доош`}
              className="h-9 w-9 rounded-lg border border-line text-white/70 hover:bg-white/5 disabled:opacity-30"
            >
              ↓
            </button>
            <form action={orderRemove}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="movieId" value={m.id} />
              <button className="h-9 rounded-lg border border-hot/30 px-3 text-sm text-hot hover:bg-hot/10">
                Хасах
              </button>
            </form>
          </div>
        ))}
      </div>
      <p role="status" className={`mt-2 min-h-5 text-sm ${error ? "text-hot" : "text-muted"}`}>
        {error || (saving ? "Хадгалж байна…" : "")}
      </p>
    </>
  );
}
