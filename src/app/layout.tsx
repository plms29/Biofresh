import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/client-layout";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BioFresh OS — Smart Post-Harvest Management",
  description:
    "Hệ thống quản lý sau thu hoạch thông minh, tích hợp AI phân tích và tối ưu hóa chuỗi giá trị nông sản Việt Nam.",
  keywords: [
    "post-harvest",
    "nông sản",
    "AI",
    "truy xuất nguồn gốc",
    "OCOP",
    "sấy thăng hoa",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
