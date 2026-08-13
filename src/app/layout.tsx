import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BioFresh OS — Vận hành sau thu hoạch",
    template: "%s · BioFresh OS",
  },
  description:
    "Hệ thống vận hành cho HTX nông sản: nhu cầu khách mua xuống tới vườn, tồn kho thật cho bán hàng, và phòng quyết định cho hàng dư thừa.",
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
    <html lang="vi" className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh bg-background">{children}</body>
    </html>
  );
}
