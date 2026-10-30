"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Хянах самбар", exact: true },
  { href: "/admin/movies", label: "Кинонууд" },
  { href: "/admin/users", label: "Хэрэглэгчид" },
  { href: "/admin/plans", label: "Багц" },
  { href: "/admin/genres", label: "Ангилал" },
  { href: "/admin/hero", label: "Hero" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 text-sm sm:mx-0 sm:px-0">
      {LINKS.map((l) => {
        const active = l.exact
          ? pathname === l.href
          : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-full px-3.5 py-1.5 transition-colors ${
              active
                ? "bg-accent/15 font-semibold text-accent-light"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <Link
        href="/"
        target="_blank"
        className="shrink-0 rounded-full px-3.5 py-1.5 text-white/60 hover:text-white"
      >
        Сайт ↗
      </Link>
    </nav>
  );
}
