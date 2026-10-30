import Image from "next/image";
import Link from "next/link";
import logoLight from "@/public/brand/nemo-logo.png";
import logoDark from "@/public/brand/nemo-logo-dark.png";

/** `light` is the white logo for dark backgrounds; `dark` is for light ones. */
export default function Logo({
  className = "",
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  return (
    <Link
      href="/"
      aria-label="NemoMovie нүүр"
      className={`inline-flex shrink-0 items-start gap-1.5 select-none ${className}`}
    >
      <Image
        src={variant === "dark" ? logoDark : logoLight}
        alt="nemo"
        priority
        className="h-9 w-auto"
      />
      {/* Glowing "REC" light */}
      <span className="rec-dot mt-1" aria-hidden />
    </Link>
  );
}
