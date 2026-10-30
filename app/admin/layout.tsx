import type { Metadata } from "next";
import { Suspense } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children, modal }: LayoutProps<"/admin">) {
  return (
    <div className="admin-theme min-h-screen flex-1 lg:flex">
      <Suspense fallback={null}>
        <AdminSidebar />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
      {modal}
    </div>
  );
}
