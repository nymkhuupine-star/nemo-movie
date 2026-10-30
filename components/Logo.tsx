import Image from "next/image";
import Link from "next/link";
import logo from "@/public/brand/nemo-logo.png";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="NemoMovie нүүр"
      className={`inline-flex shrink-0 items-start gap-1.5 select-none ${className}`}
    >
      <Image src={logo} alt="nemo" priority className="h-9 w-auto" />
      {/* Glowing "REC" light */}
      <span className="rec-dot mt-1" aria-hidden />
    </Link>
  );
}
