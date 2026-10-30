"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import logoDark from "@/public/brand/nemo-logo-dark.png";
import { logout } from "@/app/admin/actions";
import {
  IconBack,
  IconBox,
  IconCard,
  IconChevron,
  IconFilm,
  IconLogout,
  IconMenu,
  IconOverview,
  IconTag,
  IconUser,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactNode;
  exact?: boolean;
  also?: string;
};

const MAIN: NavItem[] = [
  { href: "/admin", label: "Тойм", icon: IconOverview, exact: true },
  { href: "/admin/movies", label: "Кино", icon: IconFilm, also: "/admin/order" },
  { href: "/admin/purchases", label: "Худалдан авалт", icon: IconCard },
  { href: "/admin/users", label: "Хэрэглэгчид", icon: IconUser },
];
const SETTINGS: NavItem[] = [
  { href: "/admin/plans", label: "Багц", icon: IconBox },
  { href: "/admin/genres", label: "Ангилал", icon: IconTag },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname === "/admin/login") return null;

  const isActive = (href: string, exact?: boolean, also?: string) =>
    exact
      ? pathname === href
      : pathname.startsWith(href) || Boolean(also && pathname.startsWith(also));

  const link = (l: NavItem) => {
    const active = isActive(l.href, l.exact, l.also);
    const Icon = l.icon;
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] transition-colors ${
          active
            ? "bg-accent/10 font-semibold text-accent-light"
            : "text-white/70 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1">{l.label}</span>
        {active && <IconChevron className="h-4 w-4" />}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <Image src={logoDark} alt="nemo" className="h-7 w-auto" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Цэс"
          className="rounded-lg p-2 text-white/70 hover:bg-white/5"
        >
          <IconMenu />
        </button>
      </div>

      <aside
        className={`${
          open ? "flex" : "hidden"
        } fixed inset-y-0 left-0 z-40 w-[280px] flex-col border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[260px] lg:shrink-0`}
      >
        <div className="px-6 pt-6 pb-8">
          <Link href="/admin" className="inline-block">
            <Image src={logoDark} alt="nemo" priority className="h-9 w-auto" />
          </Link>
          <p className="mt-1 text-sm text-muted">Admin Panel</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {MAIN.map(link)}
          <p className="px-4 pt-6 pb-2 text-xs font-medium tracking-wide text-muted uppercase">
            Тохиргоо
          </p>
          {SETTINGS.map(link)}
        </nav>

        <div className="space-y-1 border-t border-line px-3 py-4">
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] text-white/70 hover:bg-white/5 hover:text-white">
              <IconLogout className="h-5 w-5" />
              Гарах
            </button>
          </form>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] text-white/70 hover:bg-white/5 hover:text-white"
          >
            <IconBack className="h-5 w-5" />
            Үндсэн хуудас руу буцах
          </Link>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Хаах"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}
    </>
  );
}
