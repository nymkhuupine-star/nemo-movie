"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import CheckoutModal from "./CheckoutModal";
import Poster from "./Poster";
import { useApp } from "./AppProvider";
import type { CheckoutItem } from "@/app/payment-actions";
import {
  MOVIE_ACCESS_DAYS,
  formatDuration,
  formatPrice,
  genreLabel,
  type Movie,
  type Plan,
} from "@/lib/movies";

function Option({
  title,
  badge,
  description,
  price,
  onClick,
}: {
  title: string;
  badge?: string;
  description: string;
  price: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-5 text-left transition-colors sm:px-6 ${
        badge
          ? "border-accent/50 bg-accent/10 hover:bg-accent/15"
          : "border-line bg-white/[.02] hover:bg-white/[.06]"
      }`}
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 font-semibold sm:text-lg">
          {title}
          {badge && (
            <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm text-muted">{description}</span>
      </span>
      <span className="shrink-0 text-lg font-bold text-accent-light sm:text-xl">
        {formatPrice(price)}
      </span>
    </button>
  );
}

/** Buy page: the title on the left, and that title or a plan to pay for on the right. */
export default function PayOptions({ movie, plans }: { movie: Movie; plans: Plan[] }) {
  const router = useRouter();
  const { user, openAuth } = useApp();
  const [item, setItem] = useState<CheckoutItem | null>(null);
  const paid = useRef(false);
  const isSeries = Boolean(movie.episodes);
  const days = `${MOVIE_ACCESS_DAYS} хоног`;

  const goBack = () => {
    // Opened from a link there's nothing to go back to.
    if (window.history.length > 1) router.back();
    else router.push(`/movie/${movie.id}`);
  };

  const pick = (next: CheckoutItem) => {
    if (user) setItem(next);
    else openAuth("login", () => setItem(next));
  };

  return (
    <div className="mx-auto max-w-[1120px] px-4 pt-6 pb-14 sm:px-6">
      {item && (
        <CheckoutModal
          item={item}
          onClose={() => {
            setItem(null);
            if (paid.current) goBack();
          }}
          onPaid={() => {
            paid.current = true;
          }}
        />
      )}

      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Буцах"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-lg transition-colors hover:bg-surface-2"
        >
          ←
        </button>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Төлбөр төлөх</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="relative h-36 overflow-hidden">
            {movie.backdrop ? (
              <Image src={movie.backdrop} alt="" fill sizes="520px" className="object-cover opacity-70" />
            ) : (
              <Poster movie={movie} className="h-full w-full scale-125 opacity-50 blur-2xl" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface" />
          </div>

          <div className="relative -mt-20 flex items-end gap-4 px-5 sm:px-7">
            <Poster
              movie={movie}
              className="aspect-[2/3] w-28 shrink-0 rounded-xl shadow-2xl"
              sizes="112px"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wider text-accent-light uppercase">
                {isSeries ? "Цуврал" : "Кино"}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">{movie.title}</h2>
              <p className="mt-1 text-sm text-muted">
                {movie.year} · {genreLabel(movie)}
                {movie.episodes
                  ? ` · ${movie.episodes} анги`
                  : movie.duration
                    ? ` · ${formatDuration(movie.duration)}`
                    : ""}
              </p>
            </div>
          </div>

          <div className="mx-5 mt-6 flex items-center justify-between border-y border-line py-3.5 text-sm sm:mx-7">
            <span className="text-muted">Үзэх эрх</span>
            <b>{days}</b>
          </div>
          <div className="mx-5 flex items-center justify-between py-4 sm:mx-7">
            <b className="text-sm">Нийт дүн</b>
            <span className="text-2xl font-black tracking-tight">{formatPrice(movie.price)}</span>
          </div>

          <ul className="space-y-2.5 border-t border-line px-5 py-5 text-sm text-white/60 sm:px-7">
            {[
              "Төлбөр баталгаажмагц автоматаар нээгдэнэ",
              `${MOVIE_ACCESS_DAYS} хоногийн турш дуртай үедээ үзнэ`,
              "Утас, компьютер, таблет дээр үзнэ",
            ].map((text) => (
              <li key={text} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] text-accent-light">
                  ✓
                </span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">Төлөх сонголтоо сонгоно уу</h2>
          <p className="mt-1 mb-5 text-sm text-muted">Багц авбал бүх кино, цуврал нэг дор нээгдэнэ.</p>

          <div className="space-y-3">
            <Option
              title={isSeries ? "Зөвхөн энэ цуврал" : "Зөвхөн энэ кино"}
              description={`${days} үзэх эрх`}
              price={movie.price}
              onClick={() => pick({ kind: "movie", movieId: movie.id })}
            />
            {plans.map((plan) => (
              <Option
                key={plan.id}
                title={plan.name}
                badge={plan.badge}
                description={plan.description}
                price={plan.price}
                onClick={() => pick({ kind: "subscription", planId: plan.id })}
              />
            ))}
          </div>

          <p className="mt-5 text-center text-xs text-muted">
            Төлбөр нэг удаагийнх — автоматаар сунгахгүй.
          </p>
        </section>
      </div>
    </div>
  );
}
