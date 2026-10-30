import { Suspense } from "react";
import AdminHeader from "./AdminHeader";

const NOTICE_TEXT: Record<string, [string, boolean]> = {
  saved: ["Хадгаллаа.", true],
  deleted: ["Устгалаа.", true],
  invalid: ["Талбаруудыг зөв бөглөнө үү.", false],
  exists: ["Ийм slug-тэй ангилал аль хэдийн байна.", false],
  "in-use": ["Энэ ангилалд кино байгаа тул устгах боломжгүй.", false],
  error: ["Алдаа гарлаа. Supabase дээр admin.sql ажиллуулсан эсэхээ шалгана уу.", false],
};

export function Notice({ code }: { code?: string | string[] }) {
  const n = NOTICE_TEXT[String(code ?? "")];
  if (!n) return null;
  return (
    <p
      className={`mb-5 rounded-xl border px-4 py-2.5 text-sm ${
        n[1]
          ? "border-accent/30 bg-accent/10 text-accent-light"
          : "border-hot/30 bg-hot/10 text-hot"
      }`}
    >
      {n[0]}
    </p>
  );
}

export function MissingTable({ name }: { name: string }) {
  return (
    <p className="mb-5 rounded-xl border border-price/30 bg-price/5 px-4 py-2.5 text-sm text-white/75">
      <code>{name}</code> хүснэгт алга. Supabase SQL Editor дээр{" "}
      <code>supabase/admin.sql</code>-ийг ажиллуулна уу.
    </p>
  );
}

/** Admin page frame: header, title, and a Suspense boundary for the body. */
export default function AdminShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-muted">Ачаалж байна…</p>}>
            {children}
          </Suspense>
        </div>
      </div>
    </>
  );
}
