"use client";

import * as React from "react";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = React.createContext<{
  toast: (text: string, tone?: Tone) => void;
}>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const seq = React.useRef(0);

  const toast = React.useCallback((text: string, tone: Tone = "success") => {
    seq.current += 1;
    const id = seq.current;
    setItems((prev) => [...prev, { id, text, tone }]);
    window.setTimeout(
      () => setItems((prev) => prev.filter((t) => t.id !== id)),
      4200
    );
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {items.map((t) => {
          const Icon =
            t.tone === "success"
              ? CheckCircle2
              : t.tone === "error"
                ? TriangleAlert
                : Info;
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lg ring-1 animate-in slide-in-from-bottom-3",
                t.tone === "success" &&
                  "bg-leaf-700 text-white ring-leaf-800/40",
                t.tone === "error" && "bg-risk-500 text-white ring-risk-700/40",
                t.tone === "info" && "bg-card text-foreground ring-foreground/10"
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">{t.text}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
