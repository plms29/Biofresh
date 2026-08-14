import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Picking",
};

/**
 * The picking screen sits outside the role shell on purpose — no sidebar, no
 * alerts, no navigation — so it needs its own toast host.
 */
export default function PickLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
