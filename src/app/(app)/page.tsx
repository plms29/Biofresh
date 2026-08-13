"use client";

import Link from "next/link";
import * as React from "react";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  Coins,
  PackageSearch,
  ShoppingBasket,
  Sprout,
  Warehouse,
} from "lucide-react";
import { ROLE_META, type Role } from "@/types";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow } from "@/hooks/use-client-state";
import { computeAlerts } from "@/lib/domain/alerts";
import {
  sellableInventory,
  unallocatedLots,
  valueAtRisk,
} from "@/lib/domain/inventory";
import { dt, kg, vndShort } from "@/lib/domain/format";
import { AlertList } from "@/components/common/alert-list";
import { Kpi, PageHeader, SectionTitle } from "@/components/common/layout-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FLOW = [
  {
    step: "1",
    role: "sales" as Role,
    title: "Capture demand and specification",
    text: "Buyers still send requests by Zalo, email and phone. Sales enters them into the system once.",
    icon: ShoppingBasket,
  },
  {
    step: "2",
    role: "field" as Role,
    title: "Visual picking guide",
    text: "The buyer specification becomes a short picking guide for the field automatically.",
    icon: Sprout,
  },
  {
    step: "3",
    role: "packhouse" as Role,
    title: "Real quantity and grade",
    text: "The packhouse confirms the batch and enters the grading result by hand.",
    icon: Warehouse,
  },
  {
    step: "4",
    role: "sales" as Role,
    title: "Sellable inventory updates at once",
    text: "Sales sees exactly how many kg of each grade can be sold, with shortage warnings.",
    icon: PackageSearch,
  },
  {
    step: "5",
    role: "manager" as Role,
    title: "Decision Room for surplus",
    text: "Sell now / switch channel / preserve / process / hold — compared by expected value.",
    icon: ClipboardList,
  },
  {
    step: "6",
    role: "packhouse" as Role,
    title: "Execute and close the batch",
    text: "Record the six BioFresh Field Protocol steps, ship, and enter the actual result.",
    icon: Boxes,
  },
];

export default function OverviewPage() {
  const hydrated = useHydrated();
  const now = useNow();
  const state = useBio();

  const alerts = React.useMemo(
    () =>
      now === 0
        ? []
        : computeAlerts({
            orders: state.orders,
            batches: state.batches,
            allocations: state.allocations,
            harvestOrders: state.harvestOrders,
            cases: state.cases,
            config: state.config,
            now,
          }),
    [state, now]
  );

  const inventory = sellableInventory(state.batches, state.allocations);
  const availableKg = inventory.reduce((s, r) => s + r.availableKg, 0);
  const surplus = unallocatedLots(state.batches, state.allocations);
  const surplusKg = surplus.reduce((s, l) => s + l.availableKg, 0);
  const atRisk = valueAtRisk(surplus);
  const openOrders = state.orders.filter(
    (o) => o.status === "confirmed" || o.status === "draft"
  );
  const openCases = state.cases.filter((c) => !c.chosenOptionId);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Chain overview"
        title="One batch, one data trail, four roles"
        description="BioFresh solves four breakages only: buyer requirements never reach the field, Sales cannot see real inventory, grading results arrive too late, and nobody decides what to do with surplus. Buyers need no login — they simply scan a QR code to read the Process Passport."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Open orders"
          value={hydrated ? openOrders.length : "—"}
          sub={`${state.orders.filter((o) => o.status === "confirmed").length} confirmed`}
          icon={ShoppingBasket}
        />
        <Kpi
          label="Sellable inventory"
          value={hydrated ? kg(availableKg) : "—"}
          sub="Grade A and B, quality checked"
          tone="leaf"
          icon={PackageSearch}
        />
        <Kpi
          label="Unallocated"
          value={hydrated ? kg(surplusKg) : "—"}
          sub={`${surplus.length} sub-lots awaiting a decision`}
          tone="sun"
          icon={Boxes}
        />
        <Kpi
          label="Value at risk"
          value={hydrated ? vndShort(atRisk) : "—"}
          sub="At the internal reference price"
          tone="risk"
          icon={Coins}
        />
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle
          title="Operating flow"
          hint="Each step is a screen for one role, all working from a single database."
        />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {FLOW.map((f) => (
            <Link
              key={f.step}
              href={ROLE_META[f.role].home}
              className="group rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-all hover:ring-leaf-300"
            >
              <div className="flex items-center gap-2.5">
                <span className="tnum flex size-7 items-center justify-center rounded-lg bg-leaf-50 text-sm font-semibold text-leaf-700 ring-1 ring-leaf-200">
                  {f.step}
                </span>
                <f.icon className="size-4 text-leaf-600" />
                <span className="ml-auto text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {ROLE_META[f.role].short}
                </span>
              </div>
              <p className="mt-3 font-heading text-sm font-semibold">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-leaf-700 opacity-0 transition-opacity group-hover:opacity-100">
                Open screen <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              <span>System-wide alerts</span>
              <span className="tnum text-sm font-normal text-muted-foreground">
                {hydrated ? alerts.length : 0} items
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hydrated ? <AlertList alerts={alerts} limit={6} /> : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {(hydrated ? state.activity.slice(0, 8) : []).map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-leaf-400" />
                  <div className="min-w-0">
                    <p className="text-sm">{a.text}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.actor} · {dt(a.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {openCases.length > 0 && hydrated ? (
        <Link
          href="/manager"
          className="flex items-center gap-3 rounded-xl bg-leaf-700 px-5 py-4 text-white transition-colors hover:bg-leaf-800"
        >
          <ClipboardList className="size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">
              {openCases.length} decision cases waiting on the Manager
            </p>
            <p className="text-sm text-white/80">
              {kg(openCases.reduce((s, c) => s + c.unallocatedKg, 0))}{" "}
              unallocated in total.
            </p>
          </div>
          <ArrowRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
