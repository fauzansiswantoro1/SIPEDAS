import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Navigation from "@/components/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "SIPEDAS - Sistem Pengolahan Data Absensi",
  description:
    "Sistem Pengolahan Data Absensi untuk manajemen uang makan dan tunjangan karyawan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
    >
      <body>
        <Suspense fallback={<div>Loading...</div>}>
          <Navigation />
          {children}
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
