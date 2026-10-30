import type { Metadata } from "next";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Нууц үг шинэчлэх",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-[400px] rounded-3xl border border-line bg-[#0e0e0e] p-6 shadow-2xl sm:p-7">
        <h1 className="text-xl font-bold tracking-tight">Нууц үг шинэчлэх</h1>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
