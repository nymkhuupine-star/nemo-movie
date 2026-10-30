import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col items-center px-4 py-28 text-center">
      <p className="text-gradient text-7xl font-black tracking-tight">404</p>
      <p className="mt-4 text-white/60">Хуудас олдсонгүй.</p>
      <Link
        href="/"
        className="btn-accent mt-8 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold"
      >
        Нүүр хуудас руу буцах
      </Link>
    </div>
  );
}
