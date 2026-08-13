"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Hand-rolled dialog: locks background scroll, closes on Escape or scrim click,
 * and moves focus into the panel so keyboard and screen-reader users land in
 * the right place. Animation is handled by the global motion tokens, which
 * already respect prefers-reduced-motion.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Return focus to whatever opened the dialog once it closes.
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Scrim is strong enough to lift the panel clear of the page behind it. */}
      <button
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-leaf-900/45 backdrop-blur-[3px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-card shadow-[var(--shadow-e4)] ring-1 ring-foreground/10 outline-none sm:max-w-lg sm:rounded-2xl",
          "motion-safe:animate-in motion-safe:duration-200 motion-safe:slide-in-from-bottom-4 sm:motion-safe:zoom-in-95 sm:motion-safe:slide-in-from-bottom-0",
          className
        )}
      >
        {/* Grab handle reads as "drag me down to dismiss" on phones. */}
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border sm:hidden" />
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-heading text-base font-semibold">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <XIcon />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
