"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";

/** One bucket of revenue: an hour, a day or a month. */
export type ChartPoint = {
  /** Short axis label ("14:00", "10/14", "3-р сар"). */
  label: string;
  /** Fuller name for the tooltip ("10-р сарын 14"). */
  title: string;
  amount: number;
  /** Not reached yet (later today): keeps its place on the axis but isn't drawn. */
  future?: boolean;
};

const HEIGHT = 280;
const PAD = { top: 16, right: 16, bottom: 30, left: 52 };
// Narrowest the plot gets (a 320px phone leaves about 250px for it).
const MIN_WIDTH = 200;

const formatMNT = (n: number) => `${n.toLocaleString("en-US")}₮`;

/** Axis ticks: 0, 15K, 1.2M… */
function compact(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

/** A round step (1, 2, 2.5 or 5 × a power of ten) with at most five ticks above zero. */
function niceTicks(max: number) {
  if (max <= 0) return [0, 1000, 2000, 3000, 4000];
  const power = 10 ** Math.floor(Math.log10(max / 5));
  const step = [1, 2, 2.5, 5, 10, 20, 25, 50]
    .map((m) => m * power)
    .find((st) => Math.ceil(max / st) <= 5)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** Smooth curve that never overshoots its points, so a quiet day never dips below zero. */
function monotonePath(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${points[0].x} ${points[0].y}`;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    slopes.push((points[i + 1].y - points[i].y) / (points[i + 1].x - points[i].x));
  }
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === n - 1) return slopes[n - 2];
    const [a, b] = [slopes[i - 1], slopes[i]];
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    const third = (q.x - p.x) / 3;
    d += ` C ${p.x + third} ${p.y + tangents[i] * third}, ${q.x - third} ${q.y - tangents[i + 1] * third}, ${q.x} ${q.y}`;
  }
  return d;
}

/**
 * Revenue over time as one line over a light wash. Hovering (or the arrow keys)
 * moves a crosshair that snaps to the nearest bucket and shows its amount.
 */
export default function RevenueChart({ data }: { data: ChartPoint[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);

  // Measured before paint, so a phone never sees the default width spill out of its card.
  const attachWrap = useCallback((el: HTMLDivElement | null) => {
    wrapRef.current = el;
    if (!el) return;
    setWidth(Math.max(MIN_WIDTH, el.clientWidth));
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(MIN_WIDTH, entry.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const ticks = niceTicks(Math.max(0, ...data.filter((d) => !d.future).map((d) => d.amount)));
  const top = ticks[ticks.length - 1];
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        x: PAD.left + (data.length > 1 ? (plotW * i) / (data.length - 1) : plotW / 2),
        y: PAD.top + plotH - (plotH * d.amount) / top,
      })),
    [data, plotW, plotH, top],
  );
  // The line runs up to now; buckets still to come stay empty.
  const drawn = points.filter((p) => !p.future);
  const lastDrawn = drawn.length - 1;
  const line = monotonePath(drawn);
  const baseline = PAD.top + plotH;
  const area =
    drawn.length > 1 ? `${line} L ${drawn.at(-1)!.x} ${baseline} L ${drawn[0].x} ${baseline} Z` : "";

  // About six evenly spaced x labels, always including the last one.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));
  const showLabel = (i: number) =>
    i === data.length - 1 || (i % labelEvery === 0 && data.length - 1 - i > labelEvery * 0.6);

  const nearest = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || drawn.length === 0) return null;
    const x = clientX - rect.left;
    let best = 0;
    for (let i = 1; i < drawn.length; i++) {
      if (Math.abs(drawn[i].x - x) < Math.abs(drawn[best].x - x)) best = i;
    }
    return best;
  };

  const shown = active !== null ? (drawn[active] ?? null) : null;
  const last = drawn.at(-1);
  // A new range draws in again.
  const drawKey = `${data.length}-${data[0]?.label}-${data.at(-1)?.label}`;

  return (
    <div
      ref={attachWrap}
      className="relative min-w-0 outline-none select-none"
      tabIndex={0}
      role="img"
      aria-label="Орлогын график. Сумаар тус бүрийн дүнг харна."
      onPointerMove={(e) => setActive(nearest(e.clientX))}
      onPointerLeave={() => setActive(null)}
      onFocus={() => setActive((a) => a ?? (lastDrawn >= 0 ? lastDrawn : null))}
      onBlur={() => setActive(null)}
      onKeyDown={(e) => {
        if (lastDrawn < 0) return;
        if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? lastDrawn + 1) - 1));
        if (e.key === "ArrowRight") setActive((a) => Math.min(lastDrawn, (a ?? -1) + 1));
      }}
    >
      <svg width={width} height={HEIGHT} className="block overflow-visible">
        <defs>
          <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
          {/* Uncovers the line and its wash from left to right when a range is shown. */}
          <clipPath id={`${id}-reveal`}>
            <rect key={drawKey} x={0} y={0} width={width} height={HEIGHT} className="revenue-reveal" />
          </clipPath>
        </defs>

        {ticks.map((t) => {
          const y = PAD.top + plotH - (plotH * t) / top;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke="var(--color-line)" strokeWidth={1} />
              <text x={PAD.left - 10} y={y + 4} textAnchor="end" fontSize={11} fill="var(--color-muted)" className="tabular-nums">
                {compact(t)}
              </text>
            </g>
          );
        })}

        {points.map(
          (p, i) =>
            showLabel(i) && (
              <text
                key={i}
                x={p.x}
                y={HEIGHT - 8}
                textAnchor={i === points.length - 1 ? "end" : "middle"}
                fontSize={11}
                fill="var(--color-muted)"
              >
                {p.label}
              </text>
            ),
        )}

        <g clipPath={`url(#${id}-reveal)`}>
          {area && <path d={area} fill={`url(#${id}-wash)`} />}
          <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {last && active === null && (
          <circle cx={last.x} cy={last.y} r={4} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} />
        )}

        {shown && (
          <g pointerEvents="none">
            <line x1={shown.x} x2={shown.x} y1={PAD.top} y2={baseline} stroke="var(--color-muted)" strokeOpacity={0.35} strokeWidth={1} />
            <circle cx={shown.x} cy={shown.y} r={5} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} />
          </g>
        )}
      </svg>

      {shown && (
        <div
          className="pointer-events-none absolute z-10 min-w-28 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg shadow-black/10"
          style={{
            left: Math.min(Math.max(shown.x, 70), width - 70),
            top: Math.max(shown.y - 12, 0),
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="text-sm font-bold">{formatMNT(shown.amount)}</p>
          <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-muted">
            <span className="inline-block h-0.5 w-3 rounded-full bg-accent" aria-hidden="true" />
            {shown.title}
          </p>
        </div>
      )}
    </div>
  );
}
