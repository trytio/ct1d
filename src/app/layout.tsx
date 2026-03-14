import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CT1D — AI-Powered Type 1 Diabetes Research Explorer",
  description:
    "An AI agent dedicated to finding a cure for Type 1 Diabetes. Explore the latest research, clinical trials, and breakthroughs — all in one place.",
  openGraph: {
    title: "CT1D — AI-Powered Type 1 Diabetes Research Explorer",
    description:
      "An AI agent dedicated to finding a cure for Type 1 Diabetes. Explore the latest research, clinical trials, and breakthroughs.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
