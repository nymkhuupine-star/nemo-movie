import Link from "next/link";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { assertAdmin } from "@/lib/admin-guard";
import { activeEntitlementsByUser, formatDate, listAllUsers } from "@/lib/admin-users";

const PAGE_SIZE = 50;

async function UsersTable({
  searchParams,
}: {
  searchParams: PageProps<"/admin/users">["searchParams"];
}) {
  await assertAdmin();
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(sp.page) || 1);

  const [users, entitlements] = await Promise.all([
    listAllUsers(),
    activeEntitlementsByUser(),
  ]);
  const filtered = q ? users.filter((u) => u.email?.toLowerCase().includes(q)) : users;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {sp.deleted && (
        <p className="mb-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-accent-light">
          Хэрэглэгчийг устгалаа.
        </p>
      )}
      <form className="mb-5 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Имэйлээр хайх…"
          className="h-10 w-full max-w-sm rounded-full border border-line bg-surface px-4 text-sm text-white outline-none focus:border-accent/60"
        />
        <button className="h-10 rounded-full border border-line px-4 text-sm text-white/80 hover:text-white">
          Хайх
        </button>
      </form>
      <p className="mb-3 text-sm text-muted">{filtered.length} хэрэглэгч</p>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Имэйл</th>
              <th className="px-4 py-3 font-medium">Эрх</th>
              <th className="px-4 py-3 font-medium">Бүртгүүлсэн</th>
              <th className="px-4 py-3 font-medium">Сүүлд нэвтэрсэн</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => {
              const ents = entitlements.get(u.id) ?? [];
              const sub = ents.find((e) => e.kind === "subscription");
              const owned = ents.filter((e) => e.kind === "movie").length;
              return (
                <tr key={u.id} className="hover:bg-white/[.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.email}</p>
                    {!u.email_confirmed_at && (
                      <p className="text-xs text-price">Имэйл баталгаажаагүй</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {sub ? (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent-light">
                        Гишүүн {sub.expires_at ? `→ ${formatDate(sub.expires_at)}` : "∞"}
                      </span>
                    ) : (
                      <span className="text-white/40">—</span>
                    )}
                    {owned > 0 && (
                      <span className="ml-1.5 rounded bg-white/5 px-1.5 py-0.5 text-white/70">
                        {owned} кино
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/60">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-white/60">{formatDate(u.last_sign_in_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-white/80 hover:text-white"
                    >
                      Нээх
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Хэрэглэгч олдсонгүй.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/users?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                p === page ? "btn-accent font-semibold" : "border border-line text-white/70"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

export default function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Хэрэглэгчид</h1>
        <Suspense fallback={<p className="text-sm text-muted">Ачаалж байна…</p>}>
          <UsersTable searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
