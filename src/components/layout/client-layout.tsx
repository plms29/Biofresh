"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MascotWidget } from "@/components/mascot/mascot-widget";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useBatchStore } from "@/store/batch-store";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { fetchBatches } = useBatchStore();

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  return (
    <TooltipProvider>
      <div className="flex h-screen">
        {/* Sidebar — hidden on mobile, visible on md+ */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col md:ml-[260px] transition-all duration-300">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>

        {/* Floating Mascot */}
        <MascotWidget />
      </div>
    </TooltipProvider>
  );
}
