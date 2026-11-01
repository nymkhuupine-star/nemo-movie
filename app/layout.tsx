import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppProvider } from "@/components/AppProvider";
import MetaPixel from "@/components/MetaPixel";
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
  // Meta domain verification (Business settings → Brand safety → Domains). Keep it: Meta re-checks.
  other: { "facebook-domain-verification": "8ms2lxva82zskxj0nez8stjcofyboj" },
};

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html
      lang="mn"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        <AppProvider>
          {children}
          {modal}
        </AppProvider>
      </body>
    </html>
  );
}
