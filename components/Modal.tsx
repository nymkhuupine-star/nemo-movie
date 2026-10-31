"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "./AppProvider";

/** `fullPage` covers the whole screen; the content then brings its own back button. */
export default function Modal({
  children,
  fullPage = false,
}: {
  children: React.ReactNode;
  fullPage?: boolean;
}) {
  const router = useRouter();
  const { authOpen } = useApp();

  useEffect(() => {
    // The login dialog sits on top and handles Escape itself.
    if (authOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.back();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [router, authOpen]);

  if (fullPage) {
    return (
      <div
        className="animate-fade-in fixed inset-0 z-50 overflow-y-auto bg-black"
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">{children}</div>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && router.back()}
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-pop-in relative my-auto w-full max-w-[450px] overflow-hidden rounded-2xl border border-line bg-[#0e0e0e] shadow-2xl">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Хаах"
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur transition-colors hover:bg-black/80"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
