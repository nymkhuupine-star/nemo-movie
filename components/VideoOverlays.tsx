"use client";

import type { VideoEdit } from "@/lib/movies";

type Blur = NonNullable<VideoEdit["blurs"]>[number];

/** Player overlays (logo + blur boxes), shared by the editor preview and the site. */
export default function VideoOverlays({
  edit,
  onMoveBlur,
}: {
  edit: VideoEdit;
  onMoveBlur?: (i: number, b: Blur) => void;
}) {
  const startDrag = (i: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (!onMoveBlur) return;
    const box = e.currentTarget.parentElement!.getBoundingClientRect();
    const b = edit.blurs![i];
    const sx = e.clientX;
    const sy = e.clientY;
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / box.width) * 100;
      const dy = ((ev.clientY - sy) / box.height) * 100;
      onMoveBlur(i, {
        ...b,
        x: Math.min(100 - b.w, Math.max(0, b.x + dx)),
        y: Math.min(100 - b.h, Math.max(0, b.y + dy)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const pos = edit.logoPos ?? "tr";
  return (
    <>
      {edit.blurs?.map((b, i) => (
        <div
          key={i}
          onPointerDown={(e) => startDrag(i, e)}
          className={`absolute rounded-md bg-black/20 backdrop-blur-xl ${
            onMoveBlur ? "cursor-move ring-2 ring-accent/70" : "pointer-events-none"
          }`}
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
        />
      ))}
      {edit.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={edit.logoUrl}
          alt=""
          className="pointer-events-none absolute opacity-90"
          style={{
            width: `${edit.logoSize ?? 12}%`,
            [pos[0] === "t" ? "top" : "bottom"]: "4%",
            [pos[1] === "l" ? "left" : "right"]: "3%",
          }}
        />
      )}
    </>
  );
}

