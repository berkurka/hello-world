import type { Metadata } from "next";
import { Fraunces, Fredoka, Inter } from "next/font/google";
import { Suspense } from "react";
import { AppNotices } from "@/app/components/app-notices";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fredoka",
});

export const metadata: Metadata = {
  title: "Partyz",
  description: "Plan and organize your party here in 3 steps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${fredoka.variable}`}>
      <body>
        <Suspense fallback={null}>
          <AppNotices />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
