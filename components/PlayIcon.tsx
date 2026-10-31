/**
 * Rounded play triangle. An SVG rather than the "▶" character, which phones
 * draw in their own style. Its weight sits at the middle of the box, so a round
 * button needs no padding to look centered.
 */
export default function PlayIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11.1-6.86a1 1 0 0 0 0-1.72L9.52 4.28A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}
