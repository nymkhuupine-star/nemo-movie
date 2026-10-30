import AdminShell, { MissingTable, Notice } from "@/components/admin/AdminShell";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { assertAdmin } from "@/lib/admin-guard";
import { adminPlans } from "@/lib/admin-data";
import type { Plan } from "@/lib/movies";
import { deletePlan, savePlan } from "../catalog-actions";

const FIELD =
  "h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-white outline-none focus:border-accent/60";

function PlanForm({ plan }: { plan?: Plan }) {
  return (
    <form
      action={savePlan}
      className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-12 sm:items-end"
    >
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <label className="sm:col-span-3">
        <span className="mb-1 block text-xs text-muted">Нэр</span>
        <input name="name" required defaultValue={plan?.name} className={FIELD} />
      </label>
      <label className="sm:col-span-3">
        <span className="mb-1 block text-xs text-muted">Тайлбар</span>
        <input name="description" defaultValue={plan?.description} className={FIELD} />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs text-muted">Үнэ (₮)</span>
        <input name="price" type="number" min={0} step={100} required defaultValue={plan?.price} className={FIELD} />
      </label>
      <label className="sm:col-span-1">
        <span className="mb-1 block text-xs text-muted">Хоног</span>
        <input name="days" type="number" min={1} required defaultValue={plan?.days} className={FIELD} />
      </label>
      <label className="sm:col-span-1">
        <span className="mb-1 block text-xs text-muted">Тэмдэг</span>
        <input name="badge" placeholder="ХЯМД" defaultValue={plan?.badge} className={FIELD} />
      </label>
      <label className="sm:col-span-1">
        <span className="mb-1 block text-xs text-muted">Дараалал</span>
        <input name="sort" type="number" defaultValue={plan?.sort ?? 0} className={FIELD} />
      </label>
      <label className="flex h-10 items-center gap-2 text-sm text-white/80 sm:col-span-1">
        <input type="checkbox" name="active" defaultChecked={plan?.active ?? true} />
        Идэвхтэй
      </label>
      <div className="flex gap-2 sm:col-span-12">
        <button className="btn-accent h-9 rounded-full px-5 text-sm font-semibold">
          {plan ? "Хадгалах" : "+ Нэмэх"}
        </button>
      </div>
    </form>
  );
}

async function Plans({ searchParams }: { searchParams: PageProps<"/admin/plans">["searchParams"] }) {
  await assertAdmin();
  const [{ plans, missing }, sp] = await Promise.all([adminPlans(), searchParams]);
  return (
    <>
      <Notice code={sp.notice} />
      {missing && <MissingTable name="plans" />}
      <div className="space-y-3">
        {!missing &&
          plans.map((p) => (
            <div key={p.id} className="relative">
              <PlanForm plan={p} />
              <div className="absolute right-4 bottom-4">
                <ConfirmSubmit
                  action={deletePlan}
                  fields={{ id: p.id }}
                  confirmText={`"${p.name}" багцыг устгах уу?`}
                  className="h-9 rounded-full border border-hot/30 px-4 text-sm text-hot hover:bg-hot/10"
                >
                  Устгах
                </ConfirmSubmit>
              </div>
            </div>
          ))}
      </div>
      {!missing && (
        <div className="mt-8">
          <h2 className="mb-3 font-semibold">Шинэ багц</h2>
          <PlanForm />
        </div>
      )}
    </>
  );
}

export default function AdminPlansPage({ searchParams }: PageProps<"/admin/plans">) {
  return (
    <AdminShell
      title="Багц"
      description="Гишүүнчлэлийн хуудсанд харагдах багцууд. Идэвхгүй багц сайтад харагдахгүй."
    >
      <Plans searchParams={searchParams} />
    </AdminShell>
  );
}
