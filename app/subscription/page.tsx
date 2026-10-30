import type { Metadata } from "next";
import PlanButton from "@/components/PlanButton";
import { PLANS } from "@/lib/movies";

export const metadata: Metadata = { title: "Гишүүнчлэл" };

export default function SubscriptionPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-center text-4xl font-black tracking-[-1px] sm:text-[52px]">
        Бүх контент нээлттэй
      </h1>
      <p className="mx-auto mt-5 max-w-lg text-center text-[15px] leading-relaxed text-white/60">
        Багц авснаар кино, цуврал, богино драм бүгд нэг дор. Нэг бүрчлэн
        худалдаж авах шаардлагагүй.
      </p>

      <div className="mt-12 space-y-4">
        {PLANS.map((plan) => {
          const highlight = Boolean(plan.badge);
          return (
            <div
              key={plan.id}
              className={`flex flex-col gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7 ${
                highlight
                  ? "border-accent/40 bg-[linear-gradient(135deg,rgba(218,178,255,.16),rgba(0,0,0,0)_60%)]"
                  : "border-line bg-surface"
              }`}
            >
              <div>
                <h2 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
                  {plan.name}
                  {plan.badge && (
                    <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">
                      {plan.badge}
                    </span>
                  )}
                </h2>
                <p className="mt-1.5 text-sm text-white/55">
                  {plan.description}
                </p>
              </div>
              <div className="flex items-center gap-5">
                <p className="text-3xl font-black tracking-tight">
                  {plan.price.toLocaleString("en-US")}₮
                </p>
                <PlanButton planName={plan.name} highlight={highlight} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        Төлбөр нэг удаагийнх — автоматаар сунгахгүй. Хугацаа дуусахад энэ
        хуудаснаас дахин сунгана.
      </p>
    </div>
  );
}
