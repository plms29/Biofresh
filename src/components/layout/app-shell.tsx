"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Leaf,
  RotateCcw,
  ShoppingBasket,
  Sprout,
  Warehouse,
} from "lucide-react";
import { ROLE_META, type Role } from "@/types";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow, useSeed } from "@/hooks/use-client-state";
import { computeAlerts } from "@/lib/domain/alerts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const NAV: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  role?: Role;
}[] = [
  { href: "/", label: "Chain overview", icon: LayoutDashboard },
  { href: "/sales", label: ROLE_META.sales.screen, icon: ShoppingBasket, role: "sales" },
  { href: "/field", label: ROLE_META.field.screen, icon: Sprout, role: "field" },
  { href: "/packhouse", label: ROLE_META.packhouse.screen, icon: Warehouse, role: "packhouse" },
  { href: "/manager", label: ROLE_META.manager.screen, icon: ClipboardList, role: "manager" },
  { href: "/batches", label: "Batches", icon: Boxes },
];

const ROLES: Role[] = ["sales", "field", "packhouse", "manager"];

export function AppShell({ children }: { children: React.ReactNode }) {
  useSeed();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const now = useNow();

  const role = useBio((s) => s.role);
  const setRole = useBio((s) => s.setRole);
  const resetDemo = useBio((s) => s.resetDemo);
  const coopName = useBio((s) => s.config.coopName);

  const orders = useBio((s) => s.orders);
  const batches = useBio((s) => s.batches);
  const allocations = useBio((s) => s.allocations);
  const harvestOrders = useBio((s) => s.harvestOrders);
  const cases = useBio((s) => s.cases);
  const config = useBio((s) => s.config);

  const alerts = React.useMemo(
    () =>
      now === 0
        ? []
        : computeAlerts({
            orders,
            batches,
            allocations,
            harvestOrders,
            cases,
            config,
            now,
          }),
    [orders, batches, allocations, harvestOrders, cases, config, now]
  );

  const countFor = (r?: Role) =>
    r ? alerts.filter((a) => a.roles.includes(r)).length : 0;

  const onPickRole = (r: Role) => {
    setRole(r);
    router.push(ROLE_META[r].home);
  };

  /**
   * The active role always follows the screen in view: standing on the packhouse
   * screen means working as the packhouse. That way every action (logging a
   * protocol step, grading, allocating) is attributed to the right person rather
   * than to whichever role chip was picked last.
   */
  const routeRole = NAV.find(
    (n) => n.role && pathname.startsWith(n.href)
  )?.role;

  React.useEffect(() => {
    if (routeRole && routeRole !== role) setRole(routeRole);
  }, [routeRole, role, setRole]);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Side navigation — desktop */}
      <aside className="hidden w-[268px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-leaf-600 text-white">
            <Leaf className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="font-heading text-[15px] font-semibold">
              BioFresh <span className="text-leaf-600">OS</span>
            </p>
            <p className="text-xs text-muted-foreground">{coopName}</p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Role
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => onPickRole(r)}
                className={cn(
                  "rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors",
                  hydrated && role === r
                    ? "bg-leaf-600 text-white"
                    : "bg-muted text-foreground/70 hover:bg-accent"
                )}
              >
                {ROLE_META[r].short}
                {countFor(r) > 0 ? (
                  <span
                    className={cn(
                      "ml-1 tnum",
                      hydrated && role === r ? "text-white/90" : "text-risk-700"
                    )}
                  >
                    ·{countFor(r)}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <nav className="flex-1 px-3 py-2">
          <ul className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const badge = countFor(item.role);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-foreground/70 hover:bg-muted"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {hydrated && badge > 0 ? (
                      <span className="tnum rounded-full bg-risk-100 px-1.5 text-xs font-medium text-risk-700">
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border px-4 py-4">
          <Link
            href="/p/BF-2608-02"
            className="flex items-center gap-2 rounded-lg bg-leaf-50 px-3 py-2.5 text-sm text-leaf-800 ring-1 ring-leaf-200 transition-colors hover:bg-leaf-100"
          >
            <BadgeCheck className="size-4" />
            <span className="flex-1">View Process Passport</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start text-muted-foreground"
            onClick={() => {
              resetDemo();
              toast("Demo data has been reset.", "info");
            }}
          >
            <RotateCcw className="size-3.5" /> Reset data
          </Button>
        </div>
      </aside>

      {/* Top bar — mobile */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex size-8 items-center justify-center rounded-lg bg-leaf-600 text-white">
          <Leaf className="size-4" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-heading text-sm font-semibold">BioFresh OS</p>
          <p className="truncate text-xs text-muted-foreground">
            {hydrated ? ROLE_META[role].label : coopName}
          </p>
        </div>
        <select
          aria-label="Select role"
          value={hydrated ? role : "sales"}
          onChange={(e) => onPickRole(e.target.value as Role)}
          className="h-9 rounded-lg border border-input bg-card px-2 text-xs font-medium"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_META[r].short}
            </option>
          ))}
        </select>
      </header>

      <main className="min-w-0 flex-1 pb-24 lg:pb-10">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* Bottom navigation — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <ul className="flex">
          {NAV.filter((n) => n.href !== "/batches").map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const badge = countFor(item.role);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                    active ? "text-leaf-700" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="size-5" />
                  {hydrated && badge > 0 ? (
                    <span className="absolute top-1.5 right-1/2 translate-x-4 size-2 rounded-full bg-risk-500" />
                  ) : null}
                  <span className="max-w-full truncate px-1">
                    {item.href === "/" ? "Overview" : ROLE_META[item.role!].short}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
