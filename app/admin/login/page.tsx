import Logo from "@/components/Logo";
import LoginForm from "@/components/admin/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[380px] rounded-3xl border border-line bg-surface p-7 shadow-xl">
        <Logo variant="dark" />
        <h1 className="mt-6 text-xl font-bold tracking-tight">Admin нэвтрэх</h1>
        <p className="mt-1 text-sm text-muted">
          Admin panel руу орохын тулд нууц үгээ оруулна уу.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
