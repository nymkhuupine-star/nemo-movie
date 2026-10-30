import type { Metadata } from "next";
import ConfirmEmail from "@/components/ConfirmEmail";

export const metadata: Metadata = {
  title: "Имэйл баталгаажуулах",
  robots: { index: false },
};

export default function ConfirmPage() {
  return (
    <div className="flex justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-[400px] rounded-3xl border border-line bg-[#0e0e0e] p-6 shadow-2xl sm:p-7">
        <h1 className="text-xl font-bold tracking-tight">
          Имэйл баталгаажуулах
        </h1>
        <ConfirmEmail />
      </div>
    </div>
  );
}
