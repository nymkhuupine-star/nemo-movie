import Image from "next/image";
import Link from "next/link";
import logo from "@/public/brand/nemo-logo.png";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="NemoMovie нүүр"
      className={`inline-block shrink-0 select-none ${className}`}
    >
      <Image src={logo} alt="nemo" priority className="h-9 w-auto" />
    </Link>
  );
}
