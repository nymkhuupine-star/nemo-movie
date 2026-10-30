import Link from "next/link";
import Logo from "@/components/Logo";
import { logout } from "@/app/admin/actions";

export default function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-black/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
        <Logo />
        <span className="rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-light">
          Admin
        </span>
        <nav className="ml-4 hidden items-center gap-5 text-sm text-white/60 sm:flex">
          <Link href="/admin" className="hover:text-white">
            Кинонууд
          </Link>
          <Link href="/admin/movies/new" className="hover:text-white">
            Шинэ кино
          </Link>
          <Link href="/" target="_blank" className="hover:text-white">
            Сайт ↗
          </Link>
        </nav>
        <form action={logout} className="ml-auto">
          <button
            type="submit"
            className="h-9 rounded-full border border-line px-4 text-sm text-white/70 hover:text-white"
          >
            Гарах
          </button>
        </form>
      </div>
    </header>
  );
}
