import { Suspense } from "react";

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

export function MissingTable({ name, file = "admin.sql" }: { name: string; file?: string }) {
  return (
    <p className="mb-5 rounded-xl border border-price/30 bg-price/5 px-4 py-2.5 text-sm text-white/75">
      <code>{name}</code> алга. Supabase SQL Editor дээр{" "}
      <code>supabase/{file}</code>-ийг ажиллуулна уу.
    </p>
  );
}

/** Page frame inside the sidebar layout: title, description, actions, body. */
export default function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Ачаалж байна…</p>}>
        {children}
      </Suspense>
    </div>
  );
}
