import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BioFresh OS — Post-harvest operations",
    template: "%s · BioFresh OS",
  },
  description:
    "Operations system for a produce co-operative: buyer requirements carried down to the field, real sellable inventory for Sales, and a Decision Room for surplus.",
};

export const viewport: Viewport = {
  themeColor: "#1f7350",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh bg-background">{children}</body>
    </html>
  );
}
