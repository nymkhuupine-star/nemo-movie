import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { getGenres } from "@/lib/data";

async function SiteHeader() {
  return <Header genres={await getGenres()} />;
}

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<div className="h-16" />}>
        <SiteHeader />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
      <AuthModal />
    </>
  );
}
