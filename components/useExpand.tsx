"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Enlarges a player together with its blur boxes and logo. Bunny's own
 * fullscreen button would show only the video: a portrait one comes out cropped,
 * and whatever the blur boxes hide comes back into view.
 */
export function useExpand() {
  const frame = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    if (expanded) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setExpanded(false);
      return;
    }
    setExpanded(true);
    // Where the browser refuses (iPhone), the player still fills the window.
    frame.current?.requestFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    if (!expanded) return;
    let wasFullscreen = Boolean(document.fullscreenElement);
    const onChange = () => {
      if (wasFullscreen && !document.fullscreenElement) setExpanded(false);
      wasFullscreen = Boolean(document.fullscreenElement);
    };
    // Capture first: Escape here must not also close the dialog underneath.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setExpanded(false);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", onKey, true);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [expanded]);

  return { frame, expanded, toggle };
}

export const EXPANDED_FRAME = "fixed inset-0 z-[70] overflow-hidden";

export function ExpandButton({
  expanded,
  onClick,
  withLabel = false,
}: {
  expanded: boolean;
  onClick: () => void;
  withLabel?: boolean;
}) {
  const label = expanded ? "Жижигрүүлэх" : "Томруулах";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="absolute top-2 right-2 z-10 flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg bg-black/70 px-3 text-sm font-medium text-white hover:bg-black"
    >
      {/* SVG: phones don't all have a font with the fullscreen character. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-[18px] w-[18px] shrink-0"
      >
        <path
          d={
            expanded
              ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
              : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
          }
        />
      </svg>
      {withLabel && label}
    </button>
  );
}
