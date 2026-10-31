"use client";

import { overlayLayout, type OverlayLayout, type VideoEdit } from "@/lib/movies";

type Blur = NonNullable<OverlayLayout["blurs"]>[number];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Tracks a pointer drag and reports the movement in % of the player box
 * (the element's offset parent).
 */
function drag(
  e: React.PointerEvent<HTMLElement>,
  onMove: (dxPct: number, dyPct: number) => void,
) {
  e.preventDefault();
  e.stopPropagation();
  // Keeps the drag going when the pointer crosses the player's iframe.
  e.currentTarget.setPointerCapture(e.pointerId);
  const box =(e.currentTarget.closest("[data-overlay-box]") as HTMLElement).getBoundingClientRect();
  const sx = e.clientX;
  const sy = e.clientY;
  const move = (ev: PointerEvent) =>
    onMove(((ev.clientX - sx) / box.width) * 100, ((ev.clientY - sy) / box.height) * 100);
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

/** Round blue handle in the bottom-right corner for resizing. */
function Handle({ onPointerDown }: { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void }) {
  return (
    <span
      onPointerDown={onPointerDown}
      aria-label="Хэмжээ өөрчлөх"
      className="absolute -right-2 -bottom-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-sky-500 shadow"
    />
  );
}

/**
 * Player overlays (logo + blur boxes), shared by the editor preview and the
 * site. With `onChange` they can be dragged to move and resized from the
 * corner handle, like in the reference admin.
 */
export default function VideoOverlays({
  edit,
  onChange,
}: {
  edit: VideoEdit;
  /** Receives changes to the layout in force for this box shape. */
  onChange?: (patch: Partial<OverlayLayout>) => void;
}) {
  const editable = Boolean(onChange);
  const layout = overlayLayout(edit);
  const blurs = layout.blurs ?? [];
  const setBlur = (i: number, b: Blur) =>
    onChange?.({ blurs: blurs.map((x, j) => (j === i ? b : x)) });

  const moveBlur = (i: number, e: React.PointerEvent<HTMLElement>) => {
    const b = blurs[i];
    drag(e, (dx, dy) =>
      setBlur(i, { ...b, x: clamp(b.x + dx, 0, 100 - b.w), y: clamp(b.y + dy, 0, 100 - b.h) }),
    );
  };
  const resizeBlur = (i: number, e: React.PointerEvent<HTMLElement>) => {
    const b = blurs[i];
    drag(e, (dx, dy) =>
      setBlur(i, { ...b, w: clamp(b.w + dx, 3, 100 - b.x), h: clamp(b.h + dy, 3, 100 - b.y) }),
    );
  };

  // Logo: free x/y when set, otherwise one of the four corners.
  const size = layout.logoSize ?? 12;
  const free = layout.logoX !== undefined && layout.logoY !== undefined;
  const pos = layout.logoPos ?? "tr";
  const logoStyle: React.CSSProperties = free
    ? { left: `${layout.logoX}%`, top: `${layout.logoY}%`, width: `${size}%` }
    : {
        width: `${size}%`,
        [pos[0] === "t" ? "top" : "bottom"]: "4%",
        [pos[1] === "l" ? "left" : "right"]: "3%",
      };

  /** Current logo top-left in %, measured from the DOM when it sits in a corner. */
  const logoOrigin = (el: HTMLElement) => {
    if (free) return { x: layout.logoX!, y: layout.logoY! };
    const box = (el.closest("[data-overlay-box]") as HTMLElement).getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: ((r.left - box.left) / box.width) * 100,
      y: ((r.top - box.top) / box.height) * 100,
    };
  };
  const moveLogo = (e: React.PointerEvent<HTMLElement>) => {
    const o = logoOrigin(e.currentTarget);
    drag(e, (dx, dy) =>
      onChange?.({ logoX: clamp(o.x + dx, 0, 100 - size), logoY: clamp(o.y + dy, 0, 95) }),
    );
  };
  const resizeLogo = (e: React.PointerEvent<HTMLElement>) => {
    const wrap = e.currentTarget.parentElement as HTMLElement;
    const o = logoOrigin(wrap);
    drag(e, (dx) =>
      onChange?.({ logoX: o.x, logoY: o.y, logoSize: clamp(size + dx, 3, 60) }),
    );
  };

  return (
    <>
      {blurs.map((b, i) => (
        <div
          key={i}
          onPointerDown={editable ? (e) => moveBlur(i, e) : undefined}
          className={`absolute rounded-md bg-black/20 backdrop-blur-xl ${
            editable
              ? "cursor-move touch-none border-2 border-dashed border-white/80"
              : "pointer-events-none"
          }`}
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
        >
          {editable && <Handle onPointerDown={(e) => resizeBlur(i, e)} />}
        </div>
      ))}
      {edit.logoUrl && (
        <div
          onPointerDown={editable ? moveLogo : undefined}
          className={`absolute ${
            editable
              ? "cursor-move touch-none outline-2 outline-offset-2 outline-white/80 outline-dashed"
              : "pointer-events-none"
          }`}
          style={logoStyle}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={edit.logoUrl} alt="" draggable={false} className="block w-full opacity-90" />
          {editable && <Handle onPointerDown={resizeLogo} />}
        </div>
      )}
    </>
  );
}
