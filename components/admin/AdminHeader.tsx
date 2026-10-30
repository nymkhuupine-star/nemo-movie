import { Suspense } from "react";
import Logo from "@/components/Logo";
import AdminNav from "./AdminNav";
import { logout } from "@/app/admin/actions";

export default function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-black/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
        <Logo variant="dark" />
        <span className="rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-light">
          Admin
        </span>
        <form action={logout} className="ml-auto">
          <button
            type="submit"
            className="h-9 rounded-full border border-line px-4 text-sm text-white/70 hover:text-white"
          >
            Гарах
          </button>
        </form>
      </div>
      <div className="mx-auto max-w-[1200px] px-4 pb-3 sm:px-6">
        <Suspense fallback={<div className="h-8" />}>
          <AdminNav />
        </Suspense>
      </div>
    </header>
  );
}
