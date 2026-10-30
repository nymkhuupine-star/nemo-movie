import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { AppProvider } from "@/components/AppProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NemoMovie - Кино, Цуврал",
    template: "%s | NemoMovie",
  },
  description:
    "Шилдэг кино, цувралууд нэг дор. Монгол хадмалтай дуртай түүхээ сонгоод шууд үзээрэй.",
};

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html
      lang="mn"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProvider>
          <Suspense fallback={<div className="h-16" />}>
            <Header />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
          {modal}
          <AuthModal />
        </AppProvider>
      </body>
    </html>
  );
}
