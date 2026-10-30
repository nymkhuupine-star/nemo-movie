import Link from "next/link";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="NemoMovie нүүр"
      className={`text-gradient inline-block text-[28px] leading-none font-black tracking-[-2px] italic select-none pr-1 ${className}`}
    >
      NEMO
    </Link>
  );
}
