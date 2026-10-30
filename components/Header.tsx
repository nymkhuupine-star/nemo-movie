"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { useApp } from "./AppProvider";
import { GENRES } from "@/lib/movies";

const NAV_LINK =
  "relative py-2 text-sm font-medium transition-colors hover:text-white";

function ActiveBar() {
  return (
    <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-accent" />
  );
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, openAuth, logout } = useApp();
  const [query, setQuery] = useState("");
  const [genresOpen, setGenresOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const genresRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!genresRef.current?.contains(e.target as Node)) setGenresOpen(false);
      if (!userRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGenresOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const closeMenus = () => {
    setGenresOpen(false);
    setMobileOpen(false);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    closeMenus();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const isHome = pathname === "/";
  const isBrowse = pathname.startsWith("/browse");
  const isSubscription = pathname.startsWith("/subscription");

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${
        scrolled ? "bg-black/85 backdrop-blur-md" : "bg-black"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 sm:px-6 lg:px-6">
        <Logo />

        <nav className="ml-6 hidden items-center gap-6 text-white/60 md:flex">
          <Link
            href="/"
            className={`${NAV_LINK} ${isHome ? "text-white" : ""}`}
          >
            Нүүр
            {isHome && <ActiveBar />}
          </Link>

          <div ref={genresRef} className="relative">
            <button
              type="button"
              onClick={() => setGenresOpen((o) => !o)}
              className={`${NAV_LINK} flex items-center gap-1.5 ${
                isBrowse ? "text-white" : ""
              }`}
              aria-expanded={genresOpen}
            >
              Ангилал
              <span className="text-[9px]">▾</span>
              {isBrowse && <ActiveBar />}
            </button>
            {genresOpen && (
              <div className="animate-fade-in absolute top-full left-0 mt-3 w-48 rounded-xl border border-line bg-surface p-1.5 shadow-2xl">
                {GENRES.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/browse/${g.slug}`}
                    onClick={closeMenus}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5 hover:text-white ${
                      pathname === `/browse/${g.slug}`
                        ? "text-accent"
                        : "text-white/70"
                    }`}
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/subscription"
            className={`${NAV_LINK} ${isSubscription ? "text-white" : ""}`}
          >
            Гишүүнчлэл
            {isSubscription && <ActiveBar />}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <form
            onSubmit={submitSearch}
            className="hidden h-10 w-[250px] items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-accent/50 sm:flex lg:w-[250px]"
          >
            <span className="text-white/50">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Хайх..."
              aria-label="Хайх"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
          </form>

          {user ? (
            <div ref={userRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="btn-accent flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold uppercase"
                aria-label="Миний бүртгэл"
              >
                {user.email[0]}
              </button>
              {userMenuOpen && (
                <div className="animate-fade-in absolute top-full right-0 mt-3 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-2xl">
                  <p className="truncate px-3 py-2 text-xs text-muted">
                    {user.email}
                  </p>
                  <Link
                    href="/my-list"
                    onClick={() => setUserMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                  >
                    ♡ Миний жагсаалт
                  </Link>
                  <Link
                    href="/subscription"
                    onClick={() => setUserMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                  >
                    Гишүүнчлэл
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setUserMenuOpen(false);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-hot hover:bg-white/5"
                  >
                    Гарах
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuth("login")}
              className="btn-accent h-9 rounded-full px-5 text-sm font-semibold transition-transform hover:scale-[1.03]"
            >
              Нэвтрэх
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-white/80 md:hidden"
            aria-label="Цэс"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="animate-fade-in border-t border-line bg-black px-4 pb-5 md:hidden">
          <form
            onSubmit={submitSearch}
            className="mt-4 flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4"
          >
            <span className="text-white/50">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Хайх..."
              aria-label="Хайх"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
          </form>
          <div className="mt-4 flex flex-col gap-1 text-sm">
            <Link href="/" onClick={closeMenus} className="py-2 text-white">
              Нүүр
            </Link>
            <Link
              href="/subscription"
              onClick={closeMenus}
              className="py-2 text-white"
            >
              Гишүүнчлэл
            </Link>
            <p className="mt-2 text-xs text-muted">Ангилал</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <Link
                  key={g.slug}
                  href={`/browse/${g.slug}`}
                  onClick={closeMenus}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-white/80"
                >
                  {g.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
