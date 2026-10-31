"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { PaidPayment } from "@/lib/admin-data";
import RevenueChart, { type ChartPoint } from "./RevenueChart";

type Range = "today" | "7d" | "30d" | "month" | "year" | "all";

const RANGES: { id: Range; label: string; previous: string | null }[] = [
  { id: "today", label: "Өнөөдөр", previous: "өчигдрийн мөн цагаас" },
  { id: "7d", label: "7 хоног", previous: "өмнөх 7 хоногоос" },
  { id: "30d", label: "30 хоног", previous: "өмнөх 30 хоногоос" },
  { id: "month", label: "Энэ сар", previous: "өмнөх сарын мөн үеэс" },
  { id: "year", label: "Энэ жил", previous: "өнгөрсөн оны мөн үеэс" },
  { id: "all", label: "Бүгд", previous: null },
];

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
// How often the "Өнөөдөр" view reloads on its own.
const LIVE_REFRESH_MS = 60_000;

const formatMNT = (amount: number) => `${amount.toLocaleString("en-US")}₮`;
const pad2 = (n: number) => String(n).padStart(2, "0");

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

type Bucket = ChartPoint & { start: number; end: number };

/** One hour of a day; hours after the current one are marked as still to come. */
function hourBucket(day: Date, hour: number, now: Date): Bucket {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).getTime();
  return {
    label: `${pad2(hour)}:00`,
    title: `Өнөөдөр ${pad2(hour)}:00–${pad2(hour + 1)}:00`,
    amount: 0,
    start,
    end: start + HOUR_MS,
    future: start > now.getTime(),
  };
}

function dayBucket(d: Date): Bucket {
  return {
    label: `${d.getMonth() + 1}/${d.getDate()}`,
    title: `${d.getMonth() + 1}-р сарын ${d.getDate()}`,
    amount: 0,
    start: d.getTime(),
    end: addDays(d, 1).getTime(),
  };
}

function monthBucket(year: number, month: number): Bucket {
  return {
    label: `${month + 1}-р сар`,
    title: `${year} оны ${month + 1}-р сар`,
    amount: 0,
    start: new Date(year, month, 1).getTime(),
    end: new Date(year, month + 1, 1).getTime(),
  };
}

/**
 * The chart's buckets for a range, plus the same-length stretch just before it
 * (for the change figure). Uses the viewer's clock, which is Mongolia for the admin.
 */
function buildRange(range: Range, now: Date, firstPaid: Date | null) {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1).getTime();
  if (range === "today") {
    // The whole day on the axis, compared with yesterday up to the same time.
    const buckets = Array.from({ length: 24 }, (_, h) => hourBucket(today, h, now));
    const sameTimeYesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
    );
    return { buckets, prev: [addDays(today, -1).getTime(), sameTimeYesterday.getTime() + 1] };
  }
  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30;
    const buckets = Array.from({ length: days }, (_, i) => dayBucket(addDays(today, i - days + 1)));
    return { buckets, prev: [buckets[0].start - days * DAY_MS, buckets[0].start] };
  }
  if (range === "month") {
    const buckets = Array.from({ length: now.getDate() }, (_, i) =>
      dayBucket(new Date(now.getFullYear(), now.getMonth(), i + 1)),
    );
    return {
      buckets,
      prev: [
        new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
        new Date(now.getFullYear(), now.getMonth() - 1, now.getDate() + 1).getTime(),
      ],
    };
  }
  if (range === "year") {
    const buckets = Array.from({ length: now.getMonth() + 1 }, (_, m) => monthBucket(now.getFullYear(), m));
    buckets[buckets.length - 1].end = tomorrow;
    const prevYear = now.getFullYear() - 1;
    return {
      buckets,
      prev: [
        new Date(prevYear, 0, 1).getTime(),
        new Date(prevYear, now.getMonth(), now.getDate() + 1).getTime(),
      ],
    };
  }
  // Everything, by month, from the first sale (at least the last six months).
  const sixMonths = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const from = firstPaid && firstPaid < sixMonths ? firstPaid : sixMonths;
  const buckets: Bucket[] = [];
  for (
    let y = from.getFullYear(), m = from.getMonth();
    y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth());
    m === 11 ? (y++, (m = 0)) : m++
  ) {
    buckets.push(monthBucket(y, m));
  }
  return { buckets, prev: null };
}

function computeStats(payments: PaidPayment[], range: Range, nowMs: number) {
  const now = new Date(nowMs);
  const paid = payments
    .map((p) => ({ ...p, at: new Date(p.paidAt).getTime() }))
    .sort((a, b) => b.at - a.at);
  const firstPaid = paid.length ? new Date(paid[paid.length - 1].at) : null;
  const { buckets, prev } = buildRange(range, now, firstPaid);
  const from = buckets[0].start;
  const to = buckets[buckets.length - 1].end;

  const sum = (list: { amount: number }[]) => list.reduce((s, p) => s + p.amount, 0);
  const inRange = paid.filter((p) => p.at >= from && p.at < to);
  for (const p of inRange) {
    const bucket = buckets.find((b) => p.at >= b.start && p.at < b.end);
    if (bucket) bucket.amount += p.amount;
  }
  const total = sum(inRange);
  const prevTotal = prev ? sum(paid.filter((p) => p.at >= prev[0] && p.at < prev[1])) : null;

  const todayStart = startOfDay(now).getTime();
  const yesterdayStart = addDays(startOfDay(now), -1).getTime();

  const byItem = new Map<string, { title: string; count: number; amount: number }>();
  for (const p of inRange) {
    const entry = byItem.get(p.itemKey) ?? { title: p.title, count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += p.amount;
    byItem.set(p.itemKey, entry);
  }

  return {
    buckets,
    total,
    count: inRange.length,
    prevTotal,
    change: prevTotal ? (total - prevTotal) / prevTotal : null,
    today: sum(paid.filter((p) => p.at >= todayStart)),
    yesterday: sum(paid.filter((p) => p.at >= yesterdayStart && p.at < todayStart)),
    allTime: sum(paid),
    top: [...byItem.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
    recent: inRange.slice(0, 6),
  };
}

/** Income overview on the admin home page. Reloads through the server page's data. */
export default function RevenueOverview({ payments }: { payments: PaidPayment[] }) {
  const router = useRouter();
  const [range, setRange] = useState<Range>("today");
  const [showTable, setShowTable] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  // Set after mount: the server's clock and timezone would differ from the browser's.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, [payments]);

  // Today's figures keep themselves current while the tab is in view.
  useEffect(() => {
    if (range !== "today") return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [range, router]);

  const stats = useMemo(
    () => (now === null ? null : computeStats(payments, range, now)),
    [payments, range, now],
  );

  const rangeInfo = RANGES.find((r) => r.id === range)!;
  const changeTone = !stats || stats.change === null
    ? ""
    : stats.change > 0.005
      ? "up"
      : stats.change < -0.005
        ? "down"
        : "flat";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Тойм</h1>
          <p className="mt-1 text-sm text-muted">Орлогын тойм</p>
        </div>
        <button
          type="button"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-2 disabled:opacity-60"
        >
          <span className={refreshing ? "animate-spin" : ""}>⟳</span>
          Шинэчлэх
        </button>
      </div>

      {/* The range scopes everything below it. Three to a row on phones. */}
      <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1 sm:inline-flex sm:flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            aria-pressed={range === r.id}
            className={`rounded-lg px-2 py-2 text-sm font-semibold whitespace-nowrap transition-colors sm:px-4 ${
              range === r.id ? "btn-accent" : "text-muted hover:bg-surface-2 hover:text-white"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <section
        className={`mt-4 rounded-2xl border border-line bg-surface p-5 transition-opacity sm:p-7 ${
          refreshing ? "opacity-60" : ""
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-muted">
              Орлого · {rangeInfo.label}
              {range === "today" && (
                <span
                  className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                  title="Минут тутам автоматаар шинэчлэгдэнэ"
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600 motion-reduce:animate-none" />
                  Шууд
                </span>
              )}
            </p>
            <p className="mt-1 text-5xl font-bold tracking-tight sm:text-6xl">
              {stats ? formatMNT(stats.total) : "…"}
            </p>
            {stats && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                {changeTone && rangeInfo.previous && (
                  <>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        changeTone === "up"
                          ? "bg-emerald-500/15 text-emerald-700"
                          : changeTone === "down"
                            ? "bg-hot/10 text-hot"
                            : "bg-surface-2 text-muted"
                      }`}
                    >
                      <span aria-hidden="true">
                        {changeTone === "up" ? "▲" : changeTone === "down" ? "▼" : "■"}
                      </span>
                      {changeTone === "flat"
                        ? "Өөрчлөлтгүй"
                        : `${Math.round(Math.abs(stats.change!) * 100)}%`}
                    </span>
                    <span>{rangeInfo.previous}</span>
                  </>
                )}
                {!changeTone && rangeInfo.previous && stats.prevTotal === 0 && (
                  <span>Өмнөх үед орлого байгаагүй</span>
                )}
                <span>· {stats.count} төлбөр</span>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:text-right">
            {/* On the today view the big number already is today, so this shows yesterday. */}
            <dt className="text-muted">{range === "today" ? "Өчигдөр" : "Өнөөдөр"}</dt>
            <dt className="text-muted">Нийт (бүх цаг)</dt>
            <dd className="text-xl font-bold">
              {stats ? formatMNT(range === "today" ? stats.yesterday : stats.today) : "…"}
            </dd>
            <dd className="text-xl font-bold">{stats ? formatMNT(stats.allTime) : "…"}</dd>
          </dl>
        </div>

        <div className="mt-6">
          {stats ? (
            <RevenueChart data={stats.buckets} />
          ) : (
            <div className="h-[280px] animate-pulse rounded-xl bg-surface-2" />
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
          <span>
            {range === "today"
              ? "Цаг бүрийн орлого"
              : range === "year" || range === "all"
                ? "Сар бүрийн орлого"
                : "Өдөр бүрийн орлого"}
          </span>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="font-semibold hover:text-white"
          >
            {showTable ? "Хүснэгт нуух" : "Хүснэгтээр харах"}
          </button>
        </div>
        {showTable && stats && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {stats.buckets
                  .filter((b) => !b.future)
                  .reverse()
                  .map((b) => (
                    <tr key={b.start}>
                      <td className="px-4 py-2 text-muted">{b.title}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatMNT(b.amount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className={`mt-4 grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-5 ${refreshing ? "opacity-60" : ""}`}>
        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-base font-semibold">Хамгийн их орлоготой</h2>
          <p className="text-xs text-muted">{rangeInfo.label}</p>
          <div className="mt-4 space-y-4">
            {!stats ? (
              <p className="text-sm text-muted">Ачаалж байна…</p>
            ) : stats.top.length === 0 ? (
              <p className="text-sm text-muted">Энэ хугацаанд борлуулалт алга.</p>
            ) : (
              stats.top.map((item) => (
                <div key={item.title}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">{item.title}</p>
                    <p className="shrink-0 text-sm font-semibold">{formatMNT(item.amount)}</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-700"
                        style={{ width: `${Math.max(4, (item.amount / stats.top[0].amount) * 100)}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-muted">{item.count} удаа</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Сүүлийн төлбөрүүд</h2>
              <p className="text-xs text-muted">{rangeInfo.label}</p>
            </div>
            <Link href="/admin/purchases" className="text-sm font-medium text-muted hover:text-white">
              Бүгдийг харах →
            </Link>
          </div>
          <div className="mt-3 divide-y divide-line">
            {!stats ? (
              <p className="py-6 text-sm text-muted">Ачаалж байна…</p>
            ) : stats.recent.length === 0 ? (
              <p className="py-6 text-sm text-muted">Энэ хугацаанд төлбөр алга.</p>
            ) : (
              stats.recent.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent-light">
                    {(p.email ?? "?")[0].toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="truncate text-xs text-muted">
                      {p.email ?? "Устгагдсан хэрэглэгч"} · {formatTime(p.paidAt)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-emerald-700">+{formatMNT(p.amount)}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {now !== null && (
        <p className="mt-4 text-right text-xs text-muted">
          Сүүлд шинэчлэгдсэн: {new Date(now).toLocaleTimeString("en-GB")}
        </p>
      )}
    </div>
  );
}
