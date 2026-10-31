import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PayOptions from "@/components/PayOptions";
import { getMovie, getPlans, movieIdParams } from "@/lib/data";

type Params = PageProps<"/pay/[id]">["params"];

export const metadata: Metadata = { title: "Төлбөр төлөх" };

export function generateStaticParams() {
  return movieIdParams();
}

async function Content({ params }: { params: Params }) {
  const { id } = await params;
  const [movie, plans] = await Promise.all([getMovie(id), getPlans()]);
  if (!movie) notFound();
  return <PayOptions movie={movie} plans={plans} />;
}

export default function PayPage({ params }: PageProps<"/pay/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto mt-6 h-[520px] max-w-[1088px] animate-pulse rounded-2xl bg-white/[.03]" />
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
