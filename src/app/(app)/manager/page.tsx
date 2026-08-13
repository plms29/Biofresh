"use client";

import * as React from "react";
import Link from "next/link";
import {
  ClipboardList,
  Coins,
  Gauge,
  PackageX,
  Settings2,
  TriangleAlert,
} from "lucide-react";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import {
  orderCoverage,
  unallocatedLots,
  valueAtRisk,
} from "@/lib/domain/inventory";
import { computeAlerts } from "@/lib/domain/alerts";
import { dt, kg, untilText, vndShort } from "@/lib/domain/format";
import { EmptyState, Kpi, PageHeader, SectionTitle } from "@/components/common/layout-bits";
import { GradeTag } from "@/components/common/badges";
import { ProductLabel } from "@/components/common/product-mark";
import { AlertList } from "@/components/common/alert-list";
import { DecisionCaseCard } from "@/components/manager/decision-case-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Tab = "decisions" | "ops" | "config";

export default function ManagerPage() {
  const hydrated = useHydrated();
  const now = useNow();
  const state = useBio();
  const openCase = useBio((s) => s.openCase);
  const { toast } = useToast();

  const [tab, setTab] = React.useState<Tab>("decisions");

  const lots = unallocatedLots(state.batches, state.allocations);
  const surplusKg = lots.reduce((s, l) => s + l.availableKg, 0);
  const atRisk = valueAtRisk(lots);
  const coverages = state.orders
    .filter((o) => o.status === "confirmed")
    .map((o) => orderCoverage(o, state.batches, state.allocations));
  const riskyOrders = coverages.filter((c) => c.shortageKg > 0);
  const openCases = state.cases.filter((c) => !c.chosenOptionId);
  const decidedCases = state.cases.filter((c) => c.chosenOptionId);

  // Sub-lots with no open decision case that are over the surplus threshold or
  // close to their action deadline.
  const needsCase = lots.filter((l) => {
    const has = state.cases.some(
      (c) => c.batchId === l.batchId && c.grade === l.grade && !c.chosenOptionId
    );
    if (has) return false;
    const urgent =
      now > 0 &&
      new Date(l.actionDeadline).getTime() - now <
        state.config.urgentWithinHours * 3_600_000;
    return l.availableKg >= state.config.surplusThresholdKg || urgent;
  });

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
          }).filter((a) => a.roles.includes("manager")),
    [state, now]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations Centre + Decision Room"
        title="Surplus decided today, never left overnight"
        description="Every option carries its expected value, extra cost, time to cash and data source, so you can decide quickly and still explain the call."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Unallocated"
          value={hydrated ? kg(surplusKg) : "—"}
          sub={`${lots.length} sub-lots`}
          tone="sun"
          icon={PackageX}
        />
        <Kpi
          label="Value at risk"
          value={hydrated ? vndShort(atRisk) : "—"}
          sub="Internal reference price"
          tone="risk"
          icon={Coins}
        />
        <Kpi
          label="Orders at risk"
          value={hydrated ? riskyOrders.length : "—"}
          sub={`${kg(riskyOrders.reduce((s, c) => s + c.shortageKg, 0))} short`}
          icon={TriangleAlert}
        />
        <Kpi
          label="Cases awaiting a decision"
          value={hydrated ? openCases.length + needsCase.length : "—"}
          sub={`${decidedCases.length} already decided`}
          tone="leaf"
          icon={ClipboardList}
        />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          {
            value: "decisions",
            label: "Decision Room",
            badge: openCases.length + needsCase.length,
          },
          {
            value: "ops",
            label: "Operations",
            badge: alerts.length,
            // Alert count, not a plain total — it should read as something to act on.
            badgeTone: "risk" as const,
          },
          { value: "config", label: "Configuration" },
        ]}
      />

      {tab === "decisions" ? (
        <div className="flex flex-col gap-4">
          {hydrated && needsCase.length > 0 ? (
            <Card>
              <CardHeader className="border-b">
                <SectionTitle
                  title="Decision cases to open"
                  hint={`Over the ${kg(
                    state.config.surplusThresholdKg
                  )} threshold, or close to the action deadline.`}
                />
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {needsCase.map((l) => {
                    const urgent =
                      now > 0 &&
                      new Date(l.actionDeadline).getTime() - now <
                        state.config.urgentWithinHours * 3_600_000;
                    return (
                      <li
                        key={`${l.batchId}-${l.grade}`}
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-3 rounded-xl px-3.5 py-3 ring-1",
                          urgent
                            ? "bg-risk-100/60 ring-risk-300/60"
                            : "bg-sun-100/50 ring-sun-300/60"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            <Link
                              href={`/batches/${l.batchId}`}
                              className="hover:underline"
                            >
                              {l.batchId}
                            </Link>
                            <GradeTag grade={l.grade} />
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <ProductLabel product={l.product} /> · {l.origin} ·{" "}
                            {kg(l.availableKg)} unallocated ·{" "}
                            {now ? untilText(l.actionDeadline, now) : "—"}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            openCase(l.batchId, l.grade);
                            toast(
                              `Decision case opened for ${l.batchId} · ${l.grade}.`
                            );
                          }}
                        >
                          Open decision case
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {!hydrated ? null : openCases.length === 0 && needsCase.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No surplus to decide on"
              hint="Every quality-checked quantity already has a destination."
            />
          ) : null}

          {openCases.map((c) => (
            <DecisionCaseCard key={c.id} kase={c} now={now} />
          ))}

          {decidedCases.length > 0 ? (
            <>
              <SectionTitle
                title="Decided cases"
                hint="Track the follow-up tasks owned by each role."
              />
              {decidedCases.map((c) => (
                <DecisionCaseCard key={c.id} kase={c} now={now} />
              ))}
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "ops" ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader className="border-b">
              <CardTitle>Alerts that need you</CardTitle>
            </CardHeader>
            <CardContent>
              {hydrated ? <AlertList alerts={alerts} /> : null}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Confirmed orders and coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {coverages.map((c) => (
                    <li key={c.order.id} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {c.order.buyerName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {c.order.id} · due {dt(c.order.dueDate)}
                        </span>
                      </span>
                      <span className="tnum shrink-0 text-right">
                        <span className="block">
                          {kg(c.allocatedKg)} / {kg(c.order.qtyKg)}
                        </span>
                        <span
                          className={
                            c.shortageKg > 0
                              ? "text-xs font-medium text-risk-700"
                              : "text-xs text-leaf-700"
                          }
                        >
                          {c.shortageKg > 0
                            ? `${kg(c.shortageKg)} short`
                            : "fully covered"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Operations log</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {(hydrated ? state.activity.slice(0, 12) : []).map((a) => (
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
        </div>
      ) : null}

      {tab === "config" ? (
        <ConfigPanel
          key={`${state.config.surplusThresholdKg}-${state.config.urgentWithinHours}`}
        />
      ) : null}
    </div>
  );
}

/**
 * Co-op configuration thresholds. Remounted by key whenever the configuration
 * changes, so the inputs always start from the stored values.
 */
function ConfigPanel() {
  const config = useBio((s) => s.config);
  const setConfig = useBio((s) => s.setConfig);
  const { toast } = useToast();
  const [threshold, setThreshold] = React.useState(
    String(config.surplusThresholdKg)
  );
  const [urgentHours, setUrgentHours] = React.useState(
    String(config.urgentWithinHours)
  );

  return (
    <Card>
      <CardHeader className="border-b">
        <SectionTitle
          icon={Settings2}
          title="Co-op configuration"
          hint="This release uses thresholds set by the operator, not a remaining-freshness forecasting model."
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Surplus threshold (kg)"
            hint="Unallocated quantities above this level open a case in the Decision Room."
          >
            <Input
              type="number"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </Field>
          <Field
            label="Treat as urgent within (hours)"
            hint="Measured against each sub-lot's action deadline."
          >
            <Input
              type="number"
              inputMode="numeric"
              value={urgentHours}
              onChange={(e) => setUrgentHours(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setConfig({
                surplusThresholdKg: Math.max(1, Number(threshold) || 1),
                urgentWithinHours: Math.max(1, Number(urgentHours) || 1),
              });
              toast("Configuration saved — alerts will recalculate on the new thresholds.");
            }}
          >
            Save configuration
          </Button>
        </div>

        <div className="rounded-xl bg-muted/50 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Gauge className="size-4 text-leaf-600" /> Action window by product
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {Object.values(PRODUCTS).map((p) => (
              <li key={p.key} className="tnum flex justify-between gap-2">
                <ProductLabel product={p.key} />
                <span className="text-muted-foreground">
                  {p.actionWindowHours} hours after quality control
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
