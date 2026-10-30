"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MovieEditor, { type MovieKind } from "./MovieEditor";
import { IconPlus } from "./icons";
import type { Genre } from "@/lib/movies";

const CHOICES: { kind: MovieKind; icon: string; title: string; hint: string }[] = [
  { kind: "series", icon: "📺", title: "Олон ангитай цуврал", hint: "Анги бүр тусдаа бичлэгтэй. Эхний 3 анги үнэгүй." },
  { kind: "movie", icon: "🎬", title: "Ганц ангитай кино", hint: "Нэг бичлэгтэй бүрэн хэмжээний кино." },
];

/** "Кино нэмэх": pick movie vs series, then the editor in a modal. */
export default function NewMovieButton({
  genres,
  autoOpen = false,
}: {
  genres: Genre[];
  /** Open the chooser immediately (the /admin/movies/new page). */
  autoOpen?: boolean;
}) {
  const router = useRouter();
  const [step, setStateStep] = useState<null | "choose" | MovieKind>(autoOpen ? "choose" : null);
  const setStep = useCallback(
    (s: null | "choose" | MovieKind) => {
      // Closing on the standalone page goes back to the list.
      if (s === null && autoOpen) router.push("/admin/movies");
      setStateStep(s);
    },
    [autoOpen, router],
  );

  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && step === "choose" && setStep(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [step, setStep]);

  return (
    <>
      <button
        type="button"
        onClick={() => setStep("choose")}
        className="btn-accent inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[15px] font-semibold"
      >
        <IconPlus className="h-5 w-5" /> Кино нэмэх
      </button>

      {step && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,12,25,0.45)] p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && step === "choose" && setStep(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`animate-pop-in flex max-h-[92vh] w-full flex-col rounded-3xl bg-surface p-6 shadow-2xl sm:p-8 ${
              step === "choose" ? "max-w-[640px]" : "max-w-[840px]"
            }`}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">
                {step === "choose" ? "Юу нэмэх вэ?" : step === "series" ? "Цуврал нэмэх" : "Кино нэмэх"}
              </h2>
              <button
                type="button"
                aria-label="Хаах"
                onClick={() => setStep(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {step === "choose" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {CHOICES.map((c) => (
                  <button
                    key={c.kind}
                    type="button"
                    onClick={() => setStep(c.kind)}
                    className="group rounded-2xl border border-line bg-surface-2/50 p-6 text-left transition-colors hover:border-accent/60 hover:bg-accent/5"
                  >
                    <span className="text-4xl">{c.icon}</span>
                    <p className="mt-4 text-lg font-bold group-hover:text-accent-light">{c.title}</p>
                    <p className="mt-1 text-sm text-white/60">{c.hint}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <MovieEditor
                  key={step}
                  kind={step}
                  genres={genres}
                  onChangeKind={() => setStep("choose")}
                  onCancel={() => setStep(null)}
                  onSaved={(id, kind) => {
                    setStateStep(null);
                    if (autoOpen && kind === "movie") return router.push("/admin/movies");
                    // Series continue on the edit page to add episodes.
                    if (kind === "series") router.push(`/admin/movies/${id}?saved=1#videos`);
                    else router.refresh();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
