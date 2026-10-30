"use client";

import { useApp } from "./AppProvider";

export default function FavoriteButton({
  id,
  className = "",
  withLabel = false,
}: {
  id: string;
  className?: string;
  withLabel?: boolean;
}) {
  const { isFavorite, toggleFavorite } = useApp();
  const active = isFavorite(id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(id);
      }}
      aria-pressed={active}
      aria-label={active ? "Жагсаалтаас хасах" : "Миний жагсаалтад нэмэх"}
      className={`transition-colors ${
        active ? "text-accent" : "text-white/60 hover:text-white"
      } ${className}`}
    >
      {active ? "♥" : "♡"}
      {withLabel && <span className="ml-2">Миний жагсаалт</span>}
    </button>
  );
}
