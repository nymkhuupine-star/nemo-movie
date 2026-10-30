import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { isActive, listEntitlements } from "@/lib/access";
import { adminMovieOptions, adminPlans } from "@/lib/admin-data";
import { assertAdmin } from "@/lib/admin-guard";
import { formatDate } from "@/lib/admin-users";
import { getAdminClient } from "@/lib/supabase";
import {
  deleteUser,
  grantMovie,
  grantSubscription,
  revokeEntitlement,
} from "../../users-actions";

type Props = PageProps<"/admin/users/[id]">;

const NOTICES: Record<string, [string, boolean]> = {
  granted: ["Эрх олголоо.", true],
  revoked: ["Эрхийг цуцаллаа.", true],
  "already-forever": ["Энэ хэрэглэгч хугацаагүй гишүүнчлэлтэй байна.", false],
  error: ["Алдаа гарлаа. admin.sql ажиллуулсан эсэхээ шалгана уу.", false],
};

const FIELD =
  "h-10 rounded-xl border border-line bg-surface-2 px-3 text-sm text-white outline-none focus:border-accent/60";

async function UserDetail({ params, searchParams }: Props) {
  await assertAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const admin = getAdminClient();
  if (!admin) notFound();

  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data.user) notFound();
  const user = data.user;

  const [entitlements, { plans }, movies] = await Promise.all([
    listEntitlements(id),
    adminPlans(),
    adminMovieOptions(),
  ]);
  const titles = new Map(movies.map((m) => [m.id, m.title]));
  const notice = NOTICES[String(sp.notice ?? "")];

  return (
    <>
      {notice && (
        <p
          className={`mb-5 rounded-xl border px-4 py-2.5 text-sm ${
            notice[1]
              ? "border-accent/30 bg-accent/10 text-accent-light"
              : "border-hot/30 bg-hot/10 text-hot"
          }`}
        >
          {notice[0]}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-bold">{user.email}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Бүртгүүлсэн</dt>
            <dd>{formatDate(user.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Сүүлд нэвтэрсэн</dt>
            <dd>{formatDate(user.last_sign_in_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Имэйл</dt>
            <dd>{user.email_confirmed_at ? "✓ Баталгаажсан" : "Баталгаажаагүй"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">ID</dt>
            <dd className="truncate font-mono text-xs text-white/60">{user.id}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Эрхүүд</h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Төрөл</th>
                <th className="px-4 py-3 font-medium">Дуусах</th>
                <th className="px-4 py-3 font-medium">Тэмдэглэл</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entitlements.map((e) => (
                <tr key={e.id} className={isActive(e) ? "" : "opacity-50"}>
                  <td className="px-4 py-3">
                    {e.kind === "subscription"
                      ? "Гишүүнчлэл (бүх контент)"
                      : `Кино: ${titles.get(e.movie_id ?? "") ?? "устгагдсан"}`}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {e.expires_at ? formatDate(e.expires_at) : "Хугацаагүй"}
                    {!isActive(e) && " (дууссан)"}
                  </td>
                  <td className="px-4 py-3 text-white/60">{e.note ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <ConfirmSubmit
                      action={revokeEntitlement}
                      fields={{ id: e.id, userId: id }}
                      confirmText="Энэ эрхийг цуцлах уу?"
                      className="rounded-lg border border-hot/30 px-3 py-1.5 text-xs text-hot hover:bg-hot/10"
                    >
                      Цуцлах
                    </ConfirmSubmit>
                  </td>
                </tr>
              ))}
              {entitlements.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    Эрх олгоогүй байна.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form action={grantSubscription} className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-semibold">Гишүүнчлэл олгох</h3>
          <p className="mt-1 text-xs text-muted">
            Идэвхтэй гишүүнчлэлтэй бол дуусах өдрөөс нь үргэлжлүүлнэ.
          </p>
          <input type="hidden" name="userId" value={id} />
          <div className="mt-4 flex flex-col gap-3">
            <select name="planId" required className={FIELD}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.days} хоног, {p.price.toLocaleString("en-US")}₮
                </option>
              ))}
            </select>
            <input name="note" placeholder="Тэмдэглэл (ж: Khan bank шилжүүлэг)" className={FIELD} />
            <button className="btn-accent h-10 rounded-xl text-sm font-semibold">Олгох</button>
          </div>
        </form>

        <form action={grantMovie} className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-semibold">Кино / цуврал нээх</h3>
          <p className="mt-1 text-xs text-muted">Нэг кино худалдаж авсан үед.</p>
          <input type="hidden" name="userId" value={id} />
          <div className="mt-4 flex flex-col gap-3">
            <select name="movieId" required className={FIELD} defaultValue="">
              <option value="" disabled>
                Кино сонгох…
              </option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                  {m.episodes ? ` (${m.episodes} анги)` : ""}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <input
                name="days"
                type="number"
                min={0}
                placeholder="Хоног (хоосон = хугацаагүй)"
                className={`${FIELD} flex-1`}
              />
            </div>
            <input name="note" placeholder="Тэмдэглэл" className={FIELD} />
            <button className="btn-accent h-10 rounded-xl text-sm font-semibold">Нээх</button>
          </div>
        </form>
      </div>

      <section className="mt-10 rounded-2xl border border-hot/30 p-5">
        <h3 className="font-semibold text-hot">Аюултай бүс</h3>
        <p className="mt-1 text-sm text-white/60">
          Хэрэглэгч болон бүх эрхийг нь бүрмөсөн устгана.
        </p>
        <div className="mt-4">
          <ConfirmSubmit
            action={deleteUser}
            fields={{ userId: id }}
            confirmText={`${user.email}-г бүрмөсөн устгах уу?`}
            className="rounded-lg border border-hot/40 px-4 py-2 text-sm text-hot hover:bg-hot/10"
          >
            Хэрэглэгч устгах
          </ConfirmSubmit>
        </div>
      </section>
    </>
  );
}

export default function AdminUserPage(props: Props) {
  return (
    <>
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <Link href="/admin/users" className="text-sm text-white/60 hover:text-white">
          ← Хэрэглэгчид
        </Link>
        <h1 className="mt-3 mb-6 text-[28px] font-bold tracking-tight">Хэрэглэгч</h1>
        <Suspense fallback={<p className="text-sm text-muted">Ачаалж байна…</p>}>
          <UserDetail {...props} />
        </Suspense>
      </div>
    </>
  );
}
