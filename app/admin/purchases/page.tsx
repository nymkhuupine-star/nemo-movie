import Link from "next/link";
import AdminShell, { MissingTable } from "@/components/admin/AdminShell";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { isActive, type EntitlementRow } from "@/lib/access";
import { adminMovieOptions, adminPlans } from "@/lib/admin-data";
import { assertAdmin } from "@/lib/admin-guard";
import { formatDate, listAllUsers } from "@/lib/admin-users";
import { getAdminClient } from "@/lib/supabase";
import { revokeEntitlement } from "../users-actions";

const TABS = [
  ["all", "Бүгд"],
  ["active", "Идэвхтэй"],
  ["expired", "Дууссан"],
] as const;

async function Purchases({
  searchParams,
}: {
  searchParams: PageProps<"/admin/purchases">["searchParams"];
}) {
  await assertAdmin();
  const sp = await searchParams;
  const status = TABS.some(([k]) => k === sp.status) ? String(sp.status) : "all";

  const admin = getAdminClient()!;
  const [{ data, error }, users, movies, { plans }] = await Promise.all([
    admin.from("entitlements").select("*").order("created_at", { ascending: false }),
    listAllUsers(),
    adminMovieOptions(),
    adminPlans(),
  ]);
  if (error) return <MissingTable name="entitlements хүснэгт" />;

  const all = data as EntitlementRow[];
  const emails = new Map(users.map((u) => [u.id, u.email ?? "—"]));
  const titles = new Map(movies.map((m) => [m.id, m.title]));
  const planNames = new Map(plans.map((p) => [p.id, p.name]));
  const rows = all.filter((e) =>
    status === "all" ? true : status === "active" ? isActive(e) : !isActive(e),
  );
  const counts = {
    all: all.length,
    active: all.filter(isActive).length,
    expired: all.filter((e) => !isActive(e)).length,
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Идэвхтэй гишүүнчлэл", all.filter((e) => e.kind === "subscription" && isActive(e)).length],
          ["Кино худалдан авалт", all.filter((e) => e.kind === "movie").length],
          ["Нийт олголт", all.length],
          ["Дууссан", counts.expired],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="flex rounded-xl bg-surface-2 p-1">
            {TABS.map(([key, label]) => (
              <Link
                key={key}
                href={key === "all" ? "/admin/purchases" : `/admin/purchases?status=${key}`}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[15px] ${
                  status === key ? "bg-surface font-semibold shadow-sm" : "text-white/60 hover:text-white"
                }`}
              >
                {label}
                <span className="rounded-full bg-white/10 px-2 text-xs text-white/60">
                  {counts[key]}
                </span>
              </Link>
            ))}
          </div>
          <p className="ml-auto text-sm text-muted">
            Эрх олгохдоо: Хэрэглэгчид → хэрэглэгч сонгох → Гишүүнчлэл / Кино нээх
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[15px]">
            <thead className="bg-surface-2/60 text-sm text-muted">
              <tr>
                <th className="px-4 py-3.5 font-medium">Хэрэглэгч</th>
                <th className="px-4 py-3.5 font-medium">Юу</th>
                <th className="px-4 py-3.5 font-medium">Тэмдэглэл</th>
                <th className="px-4 py-3.5 font-medium">Олгосон</th>
                <th className="px-4 py-3.5 font-medium">Дуусах</th>
                <th className="px-4 py-3.5 font-medium">Төлөв</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((e) => {
                const active = isActive(e);
                return (
                  <tr key={e.id} className="hover:bg-white/[.02]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${e.user_id}`} className="font-medium hover:text-accent-light">
                        {emails.get(e.user_id) ?? "Устгагдсан хэрэглэгч"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {e.kind === "subscription" ? (
                        <span>
                          Гишүүнчлэл
                          {e.plan_id && planNames.get(e.plan_id) && (
                            <span className="text-muted"> · {planNames.get(e.plan_id)}</span>
                          )}
                        </span>
                      ) : (
                        <span>Кино: {titles.get(e.movie_id ?? "") ?? "устгагдсан"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">{e.note ?? "—"}</td>
                    <td className="px-4 py-3 text-white/70">{formatDate(e.created_at)}</td>
                    <td className="px-4 py-3 text-white/70">
                      {e.expires_at ? formatDate(e.expires_at) : "Хугацаагүй"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          active ? "bg-emerald-500/15 text-emerald-700" : "bg-white/10 text-white/50"
                        }`}
                      >
                        {active ? "Идэвхтэй" : "Дууссан"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ConfirmSubmit
                        action={revokeEntitlement}
                        fields={{ id: e.id, userId: e.user_id }}
                        confirmText="Энэ эрхийг цуцлах уу?"
                        className="rounded-lg border border-hot/30 px-3 py-1.5 text-sm text-hot hover:bg-hot/10"
                      >
                        Цуцлах
                      </ConfirmSubmit>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted">
                    Одоогоор худалдан авалт алга.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function AdminPurchasesPage({ searchParams }: PageProps<"/admin/purchases">) {
  return (
    <AdminShell
      title="Худалдан авалт"
      description="Хэрэглэгчдэд олгосон гишүүнчлэл болон кино худалдан авалтууд."
    >
      <Purchases searchParams={searchParams} />
    </AdminShell>
  );
}
