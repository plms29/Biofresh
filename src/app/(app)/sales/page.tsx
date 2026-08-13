"use client";

import * as React from "react";
import Link from "next/link";
import {
  Coins,
  Pencil,
  PackageSearch,
  Plus,
  Radio,
  ShoppingBasket,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  GRADE_LABEL,
  SALES_CHANNEL_LABEL,
  type Order,
} from "@/types";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import { orderCoverage, sellableInventory } from "@/lib/domain/inventory";
import { computeAlerts } from "@/lib/domain/alerts";
import { d, dt, kg, untilText, vnd, vndShort } from "@/lib/domain/format";
import { Kpi, PageHeader, SectionTitle, EmptyState } from "@/components/common/layout-bits";
import {
  ChannelTag,
  GradeTag,
  OrderStatusTag,
  AllocationStatusTag,
} from "@/components/common/badges";
import { AlertList } from "@/components/common/alert-list";
import { ProductLabel, ProductMark } from "@/components/common/product-mark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import { Segmented } from "@/components/ui/segmented";
import { OrderFormModal } from "@/components/sales/order-form-modal";
import { SignalFormModal } from "@/components/sales/signal-form";
import {
  AllocateModal,
  type AllocateTarget,
} from "@/components/sales/allocate-modal";

type Tab = "orders" | "inventory" | "signals";

export default function SalesPage() {
  const hydrated = useHydrated();
  const now = useNow();
  const state = useBio();
  const removeAllocation = useBio((s) => s.removeAllocation);
  const confirmAllocation = useBio((s) => s.confirmAllocation);
  const setOrderStatus = useBio((s) => s.setOrderStatus);

  const [tab, setTab] = React.useState<Tab>("orders");
  const [orderModal, setOrderModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Order | undefined>();
  const [signalModal, setSignalModal] = React.useState(false);
  const [allocTarget, setAllocTarget] = React.useState<AllocateTarget | null>(
    null
  );

  const openOrders = state.orders.filter(
    (o) => o.status === "confirmed" || o.status === "draft"
  );
  const coverages = openOrders
    .map((o) => orderCoverage(o, state.batches, state.allocations))
    .sort((a, b) => a.order.dueDate.localeCompare(b.order.dueDate));
  const inventory = sellableInventory(state.batches, state.allocations);
  const availableKg = inventory.reduce((s, r) => s + r.availableKg, 0);
  const shortageKg = coverages.reduce((s, c) => s + c.shortageKg, 0);
  const inventoryValue = inventory.reduce(
    (s, r) => s + r.availableKg * PRODUCTS[r.product].refPrice[r.grade],
    0
  );

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
          }).filter((a) => a.roles.includes("sales")),
    [state, now]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Sales desk"
        title="Orders, real inventory and market signals"
        description="Buyers still send requests by Zalo, email and phone. You enter them here once, and the field and packhouse work from that same specification."
        actions={
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setSignalModal(true)}
            >
              <Radio /> Market signal
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setEditing(undefined);
                setOrderModal(true);
              }}
            >
              <Plus /> New order
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Open orders"
          value={hydrated ? openOrders.length : "—"}
          sub={`${state.orders.filter((o) => o.status === "confirmed").length} confirmed`}
          icon={ShoppingBasket}
        />
        <Kpi
          label="Sellable now"
          value={hydrated ? kg(availableKg) : "—"}
          sub="Net of everything already allocated"
          tone="leaf"
          icon={PackageSearch}
        />
        <Kpi
          label="Short of stock"
          value={hydrated ? kg(shortageKg) : "—"}
          sub={`${coverages.filter((c) => c.shortageKg > 0).length} orders short`}
          tone={shortageKg > 0 ? "risk" : "leaf"}
          icon={TriangleAlert}
        />
        <Kpi
          label="Inventory value"
          value={hydrated ? vndShort(inventoryValue) : "—"}
          sub="At the internal reference price"
          tone="sky"
          icon={Coins}
        />
      </div>

      {hydrated && alerts.length > 0 ? (
        <AlertList alerts={alerts} limit={3} />
      ) : null}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "orders", label: "Open orders", badge: coverages.length },
          { value: "inventory", label: "Sellable inventory" },
          { value: "signals", label: "Market signals" },
        ]}
      />

      {tab === "orders" ? (
        <div className="flex flex-col gap-3">
          {!hydrated ? null : coverages.length === 0 ? (
            <EmptyState
              icon={ShoppingBasket}
              title="No open orders yet"
              hint="Enter a buyer request that came in by Zalo or phone to get started."
              action={
                <Button className="mt-2" onClick={() => setOrderModal(true)}>
                  <Plus /> New order
                </Button>
              }
            />
          ) : (
            coverages.map((cov) => {
              const o = cov.order;
              const allocs = state.allocations.filter((a) => a.orderId === o.id);
              const pct = Math.min(100, (cov.allocatedKg / o.qtyKg) * 100);
              return (
                <Card key={o.id}>
                  <CardHeader className="border-b">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="flex flex-wrap items-center gap-2">
                          {o.buyerName}
                          <OrderStatusTag status={o.status} />
                          <ChannelTag source={o.source} />
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {o.id} · <ProductLabel product={o.product} /> ·{" "}
                          {kg(o.qtyKg)} · {GRADE_LABEL[o.spec.grade]} ·{" "}
                          {SALES_CHANNEL_LABEL[o.salesChannel]}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tnum text-sm font-medium">
                          Due {d(o.dueDate)}
                        </p>
                        <p
                          className={
                            now && new Date(o.dueDate).getTime() - now < 48 * 3_600_000
                              ? "text-xs font-medium text-risk-700"
                              : "text-xs text-muted-foreground"
                          }
                        >
                          {now ? untilText(o.dueDate, now) : "—"}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4">
                    <div>
                      <div className="mb-1.5 flex items-baseline justify-between text-sm">
                        <span className="tnum">
                          Allocated {kg(cov.allocatedKg)} / {kg(o.qtyKg)}
                        </span>
                        {cov.shortageKg > 0 ? (
                          <span className="tnum font-medium text-risk-700">
                            Short {kg(cov.shortageKg)}
                          </span>
                        ) : cov.remainingKg > 0 ? (
                          <span className="tnum text-sun-700">
                            {kg(cov.remainingKg)} still to allocate — stock is
                            available
                          </span>
                        ) : (
                          <span className="text-leaf-700">Fully covered</span>
                        )}
                      </div>
                      <Meter
                        value={pct}
                        tone={cov.shortageKg > 0 ? "risk" : pct >= 100 ? "leaf" : "sun"}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-muted/50 px-3.5 py-3 text-sm">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Buyer specification
                        </p>
                        <ul className="mt-1.5 flex flex-col gap-0.5 text-foreground/80">
                          <li>Grade: {GRADE_LABEL[o.spec.grade]}</li>
                          {o.spec.sizeMinMm || o.spec.sizeMaxMm ? (
                            <li>
                              Size: {o.spec.sizeMinMm ?? "—"}–
                              {o.spec.sizeMaxMm ?? "—"} mm
                            </li>
                          ) : null}
                          {o.spec.colorNote ? <li>Colour: {o.spec.colorNote}</li> : null}
                          {o.spec.brixMin ? <li>Brix ≥ {o.spec.brixMin}</li> : null}
                          {o.spec.rejectNotes ? (
                            <li>Rejects: {o.spec.rejectNotes}</li>
                          ) : null}
                        </ul>
                        {o.specRevisions > 0 ? (
                          <p className="mt-2 text-xs text-sun-700">
                            Updated {o.specRevisions} times · the field has been
                            notified
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-xl bg-muted/50 px-3.5 py-3 text-sm">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          Current allocations
                        </p>
                        {allocs.length === 0 ? (
                          <p className="mt-1.5 text-muted-foreground">
                            No batch allocated yet.
                          </p>
                        ) : (
                          <ul className="mt-1.5 flex flex-col gap-1.5">
                            {allocs.map((a) => (
                              <li
                                key={a.id}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="tnum min-w-0 truncate">
                                  <Link
                                    href={`/batches/${a.batchId}`}
                                    className="font-medium hover:underline"
                                  >
                                    {a.batchId}
                                  </Link>{" "}
                                  · {kg(a.kg)}
                                </span>
                                <span className="flex shrink-0 items-center gap-1.5">
                                  <AllocationStatusTag status={a.status} />
                                  {a.status === "planned" ? (
                                    <>
                                      <Button
                                        size="xs"
                                        variant="secondary"
                                        onClick={() => confirmAllocation(a.id)}
                                      >
                                        Confirm
                                      </Button>
                                      <Button
                                        size="icon-xs"
                                        variant="ghost"
                                        aria-label="Remove allocation"
                                        onClick={() => removeAllocation(a.id)}
                                      >
                                        <Trash2 className="size-3" />
                                      </Button>
                                    </>
                                  ) : null}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {o.offerPrice ? (
                          <p className="tnum mt-2 text-xs text-muted-foreground">
                            Offer {vnd(o.offerPrice)}/kg · order value{" "}
                            {vndShort(o.offerPrice * o.qtyKg)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {o.notes ? (
                      <p className="text-sm text-muted-foreground">
                        Notes: {o.notes}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="lg"
                        disabled={cov.remainingKg <= 0 || cov.availableKg <= 0}
                        onClick={() =>
                          setAllocTarget({
                            orderId: o.id,
                            label: o.buyerName,
                            grade: o.spec.grade,
                            suggestKg: Math.min(cov.remainingKg, cov.availableKg),
                          })
                        }
                      >
                        Allocate a batch to this order
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setEditing(o);
                          setOrderModal(true);
                        }}
                      >
                        <Pencil /> Edit specification
                      </Button>
                      {o.status === "draft" ? (
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={() => setOrderStatus(o.id, "confirmed")}
                        >
                          Confirm order
                        </Button>
                      ) : cov.remainingKg <= 0 ? (
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={() => setOrderStatus(o.id, "fulfilled")}
                        >
                          Mark as fulfilled
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : null}

      {tab === "inventory" ? (
        <Card>
          <CardHeader className="border-b">
            <SectionTitle
              title="Sellable inventory by grade"
              hint="Counts only batches whose grading result has been confirmed by the packhouse."
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!hydrated ? null : inventory.length === 0 ? (
              <EmptyState
                icon={PackageSearch}
                title="No inventory yet"
                hint="Inventory appears as soon as the packhouse confirms a quality control result."
              />
            ) : (
              inventory.map((row) => (
                <div
                  key={`${row.product}-${row.grade}`}
                  className="rounded-xl ring-1 ring-foreground/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <ProductMark product={row.product} size="md" />
                      <div>
                        <p className="font-medium">{PRODUCTS[row.product].label}</p>
                        <GradeTag grade={row.grade} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="tnum font-heading text-lg font-semibold">
                        {kg(row.availableKg)}
                      </p>
                      <p className="tnum text-xs text-muted-foreground">
                        of {kg(row.qcKg)} graded
                      </p>
                    </div>
                  </div>
                  <ul className="divide-y divide-border border-t border-border">
                    {row.lots.map((l) => (
                      <li
                        key={`${l.batchId}-${l.grade}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/batches/${l.batchId}`}
                            className="font-medium hover:underline"
                          >
                            {l.batchId}
                          </Link>
                          <span className="text-muted-foreground"> · {l.origin}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="tnum">
                            {kg(l.availableKg)} left of {kg(l.qcKg)}
                          </span>
                          <span
                            className={
                              now &&
                              new Date(l.actionDeadline).getTime() - now <
                                state.config.urgentWithinHours * 3_600_000
                                ? "text-xs font-medium text-risk-700"
                                : "text-xs text-muted-foreground"
                            }
                          >
                            {now ? untilText(l.actionDeadline, now) : "—"}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={l.availableKg <= 0}
                            onClick={() =>
                              setAllocTarget({
                                label: `Batch ${l.batchId}`,
                                grade: l.grade,
                                batchId: l.batchId,
                                suggestKg: l.availableKg,
                              })
                            }
                          >
                            Allocate
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "signals" ? (
        <Card>
          <CardHeader className="border-b">
            <SectionTitle
              title="Market signals"
              hint="These figures are the basis the Decision Room uses to compare selling options."
              actions={
                <Button variant="outline" onClick={() => setSignalModal(true)}>
                  <Plus /> Add
                </Button>
              }
            />
          </CardHeader>
          <CardContent>
            {!hydrated ? null : state.signals.length === 0 ? (
              <EmptyState
                icon={Radio}
                title="No market signals yet"
                hint="Record the demand and prices you hear from buyers or the wholesale market."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {state.signals.map((s) => {
                  const expired =
                    now > 0 && new Date(s.validUntil).getTime() <= now;
                  return (
                    <li
                      key={s.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-3.5 py-3 ring-1 ${
                        expired
                          ? "bg-muted/40 ring-border"
                          : "bg-card ring-foreground/10"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {s.market}{" "}
                          <span className="text-sm font-normal text-muted-foreground">
                            {s.id}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <ProductLabel product={s.product} /> ·{" "}
                          {GRADE_LABEL[s.grade]} · wants {kg(s.qtyKg)} ·{" "}
                          {s.enteredBy}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tnum font-heading text-base font-semibold">
                          {vnd(s.price)}/kg
                        </p>
                        <p
                          className={
                            expired
                              ? "text-xs text-muted-foreground"
                              : "text-xs text-leaf-700"
                          }
                        >
                          {expired
                            ? `expired ${dt(s.validUntil)}`
                            : `valid, ${now ? untilText(s.validUntil, now) : "—"}`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {orderModal ? (
        <OrderFormModal
          key={editing?.id ?? "new-order"}
          open
          onClose={() => setOrderModal(false)}
          editing={editing}
        />
      ) : null}
      {signalModal ? (
        <SignalFormModal open onClose={() => setSignalModal(false)} />
      ) : null}
      {allocTarget ? (
        <AllocateModal
          key={`${allocTarget.orderId ?? ""}-${allocTarget.batchId ?? ""}-${allocTarget.grade ?? ""}`}
          onClose={() => setAllocTarget(null)}
          target={allocTarget}
        />
      ) : null}
    </div>
  );
}
