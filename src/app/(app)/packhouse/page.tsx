"use client";

import * as React from "react";
import Link from "next/link";
import {
  Boxes,
  ClipboardCheck,
  PackageCheck,
  Truck,
  Warehouse,
} from "lucide-react";
import type { Batch, Grade } from "@/types";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import { dt, kg, untilText } from "@/lib/domain/format";
import { batchLots } from "@/lib/domain/inventory";
import { isProtocolComplete, protocolDoneCount } from "@/lib/domain/protocol";
import { EmptyState, Kpi, PageHeader } from "@/components/common/layout-bits";
import { BatchStatusTag, GradeTag } from "@/components/common/badges";
import { ProductLabel } from "@/components/common/product-mark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Meter } from "@/components/ui/meter";
import { QcModal } from "@/components/packhouse/qc-modal";
import { ProtocolTracker } from "@/components/packhouse/protocol-tracker";
import { PackoutPanel } from "@/components/packhouse/packout-panel";
import { useToast } from "@/components/ui/toast";

const GRADES: Grade[] = ["A", "B", "PROCESS", "REJECT"];
type Tab = "incoming" | "processing";

export default function PackhousePage() {
  const hydrated = useHydrated();
  const now = useNow();
  const batches = useBio((s) => s.batches);
  const allocations = useBio((s) => s.allocations);
  const harvestOrders = useBio((s) => s.harvestOrders);
  const confirmIntake = useBio((s) => s.confirmIntake);
  const markProcessingDone = useBio((s) => s.markProcessingDone);
  const shipBatch = useBio((s) => s.shipBatch);
  const closeBatch = useBio((s) => s.closeBatch);
  const { toast } = useToast();

  const [tab, setTab] = React.useState<Tab>("incoming");
  const [qcBatch, setQcBatch] = React.useState<Batch | null>(null);
  const [intakeBatch, setIntakeBatch] = React.useState<Batch | null>(null);
  const [intakeKg, setIntakeKg] = React.useState("");
  const [closeTarget, setCloseTarget] = React.useState<Batch | null>(null);
  const [accepted, setAccepted] = React.useState("");
  const [rejected, setRejected] = React.useState("");
  const [revenue, setRevenue] = React.useState("");

  const incoming = batches.filter(
    (b) => !b.qc && b.status !== "closed" && b.status !== "shipped"
  );
  const working = batches.filter(
    (b) =>
      b.qc &&
      b.status !== "closed" &&
      ["qc_done", "decision", "processing", "shipped"].includes(b.status)
  );
  const todayQc = batches.filter(
    (b) => b.qc && now > 0 && new Date(b.qc.confirmedAt).getTime() > now - 86_400_000
  );
  const gradedKg = todayQc.reduce(
    (s, b) =>
      s +
      (Object.values(b.qc!.gradeKg) as number[]).reduce((x, y) => x + y, 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Intake and grading"
        title="Real quantity and grade, entered once"
        description="The figures you enter here are the inventory Sales sees. There is no automatic grading camera — a quality control officer confirms every result."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi
          label="Batches awaiting intake or grading"
          value={hydrated ? incoming.length : "—"}
          icon={Warehouse}
        />
        <Kpi
          label="Graded in the last 24 hours"
          value={hydrated ? kg(gradedKg) : "—"}
          sub={`${todayQc.length} batches`}
          tone="leaf"
          icon={ClipboardCheck}
        />
        <Kpi
          label="Batches in processing or awaiting despatch"
          value={hydrated ? working.length : "—"}
          tone="sun"
          icon={Boxes}
        />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "incoming", label: "Incoming batches", badge: incoming.length },
          { value: "processing", label: "Processing and despatch" },
        ]}
      />

      {tab === "incoming" ? (
        <div className="flex flex-col gap-3">
          {!hydrated ? null : incoming.length === 0 ? (
            <EmptyState
              icon={Warehouse}
              title="No batches awaiting intake"
              hint="When the field finishes a harvest order, the batch appears here."
            />
          ) : (
            incoming.map((b) => {
              const ho = harvestOrders.find((h) => h.id === b.harvestOrderId);
              return (
                <Card key={b.id}>
                  <CardHeader className="border-b">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {b.id}
                          <BatchStatusTag status={b.status} />
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          <ProductLabel product={b.product} /> · {b.origin}
                          {ho ? ` · harvest order ${ho.id}` : ""}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="tnum font-medium">{kg(b.totalKg)} expected</p>
                        <p className="text-xs text-muted-foreground">
                          picked {dt(b.harvestedAt)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button
                      size="lg"
                      variant={b.intakeAt ? "outline" : "default"}
                      onClick={() => {
                        setIntakeBatch(b);
                        setIntakeKg(String(b.totalKg));
                      }}
                    >
                      <PackageCheck />
                      {b.intakeAt ? "Edit weight received" : "Confirm intake"}
                    </Button>
                    <Button
                      size="lg"
                      variant={b.intakeAt ? "default" : "secondary"}
                      onClick={() => setQcBatch(b)}
                    >
                      <ClipboardCheck /> Enter grading result
                    </Button>
                    <Button size="lg" variant="ghost" asChild>
                      <Link href={`/batches/${b.id}`}>View batch</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : null}

      {tab === "processing" ? (
        <div className="flex flex-col gap-3">
          {!hydrated ? null : working.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No batches in processing"
              hint="Batches appear here once you have confirmed a grading result."
            />
          ) : (
            working.map((b) => {
              const lots = batchLots(b, allocations);
              const doneSteps = protocolDoneCount(b);
              const complete = isProtocolComplete(b);
              return (
                <Card key={b.id}>
                  <CardHeader className="border-b">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {b.id}
                          <BatchStatusTag status={b.status} />
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          <ProductLabel product={b.product} /> · {kg(b.totalKg)} ·
                          graded {dt(b.qc?.confirmedAt)}
                        </p>
                      </div>
                      <div className="min-w-40 text-right">
                        <p className="tnum text-sm font-medium">
                          Protocol {doneSteps}/6
                        </p>
                        <Meter
                          className="mt-1.5"
                          value={(doneSteps / 6) * 100}
                          tone={complete ? "leaf" : "sun"}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4">
                    <div className="grid gap-2 sm:grid-cols-4">
                      {GRADES.map((g) => {
                        const lot = lots.find((l) => l.grade === g);
                        return (
                          <div
                            key={g}
                            className="rounded-xl bg-muted/50 px-3 py-2.5 text-sm"
                          >
                            <GradeTag grade={g} />
                            <p className="tnum mt-1.5 font-heading text-base font-semibold">
                              {kg(b.qc?.gradeKg[g] ?? 0)}
                            </p>
                            {lot && g !== "REJECT" ? (
                              <p className="tnum text-xs text-muted-foreground">
                                {kg(lot.availableKg)} unallocated
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {/* Node 9 of the operating flow: actual packout vs the
                        confirmed order, and where it goes next. */}
                    <PackoutPanel batch={b} />

                    {lots.some(
                      (l) => l.grade !== "REJECT" && l.availableKg > 0
                    ) && now > 0 ? (
                      <p className="text-sm text-sun-700">
                        Action deadline on the unallocated quantity:{" "}
                        {untilText(lots[0].actionDeadline, now)}.
                      </p>
                    ) : null}

                    <div>
                      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        BioFresh Field Protocol
                      </p>
                      <ProtocolTracker batch={b} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Once shipped, the grading result and the protocol steps can no longer be edited. */}
                      {b.status !== "shipped" ? (
                        <>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => setQcBatch(b)}
                          >
                            Edit grading result
                          </Button>
                          <Button
                            size="lg"
                            onClick={() => {
                              const res = markProcessingDone(b.id);
                              toast(res.message, res.ok ? "success" : "error");
                            }}
                          >
                            Complete processing and packing
                          </Button>
                        </>
                      ) : null}
                      {b.status !== "shipped" ? (
                        <Button
                          size="lg"
                          variant="secondary"
                          disabled={!complete}
                          onClick={() => {
                            shipBatch(b.id);
                            toast(`Batch ${b.id} shipped.`);
                          }}
                        >
                          <Truck /> Ship
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          variant="secondary"
                          onClick={() => {
                            setCloseTarget(b);
                            const shipped = allocations
                              .filter((a) => a.batchId === b.id)
                              .reduce((s, a) => s + a.kg, 0);
                            setAccepted(String(shipped));
                            setRejected("0");
                            setRevenue(
                              String(shipped * PRODUCTS[b.product].refPrice.A)
                            );
                          }}
                        >
                          Enter result and close batch
                        </Button>
                      )}
                      <Button size="lg" variant="ghost" asChild>
                        <Link href={`/batches/${b.id}`}>View batch</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : null}

      {qcBatch ? (
        <QcModal
          key={`${qcBatch.id}-${qcBatch.qc?.confirmedAt ?? "new"}`}
          batch={qcBatch}
          onClose={() => setQcBatch(null)}
        />
      ) : null}

      {/* Confirm the weight received */}
      <Modal
        open={intakeBatch !== null}
        onClose={() => setIntakeBatch(null)}
        title={`Intake for batch ${intakeBatch?.id ?? ""}`}
        description="Weighed at the packhouse — this may differ from the figure the field reported."
        footer={
          <>
            <Button variant="outline" size="lg" onClick={() => setIntakeBatch(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={() => {
                if (!intakeBatch) return;
                confirmIntake(intakeBatch.id, Number(intakeKg) || 0);
                toast(`Intake confirmed at ${kg(Number(intakeKg) || 0)}.`);
                setIntakeBatch(null);
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <Field
          label="Weight actually received (kg)"
          hint={
            intakeBatch ? `The field reported ${kg(intakeBatch.totalKg)}` : undefined
          }
        >
          <Input
            type="number"
            inputMode="decimal"
            className="h-12 text-lg"
            value={intakeKg}
            onChange={(e) => setIntakeKg(e.target.value)}
          />
        </Field>
      </Modal>

      {/* Close the batch with the final result */}
      <Modal
        open={closeTarget !== null}
        onClose={() => setCloseTarget(null)}
        title={`Close batch ${closeTarget?.id ?? ""}`}
        description="Enter the actual result from the buyer so it can be compared with the expected value."
        footer={
          <>
            <Button variant="outline" size="lg" onClick={() => setCloseTarget(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={() => {
                if (!closeTarget) return;
                const acc = Number(accepted) || 0;
                const rej = Number(rejected) || 0;
                closeBatch(closeTarget.id, {
                  shippedKg: acc + rej,
                  acceptedKg: acc,
                  rejectedKg: rej,
                  actualRevenue: Number(revenue) || 0,
                });
                toast(`Batch ${closeTarget.id} closed.`);
                setCloseTarget(null);
              }}
            >
              Close batch
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Accepted by the buyer (kg)">
            <Input
              type="number"
              inputMode="decimal"
              value={accepted}
              onChange={(e) => setAccepted(e.target.value)}
            />
          </Field>
          <Field label="Rejected by the buyer (kg)">
            <Input
              type="number"
              inputMode="decimal"
              value={rejected}
              onChange={(e) => setRejected(e.target.value)}
            />
          </Field>
          <Field label="Actual revenue (VND)" className="sm:col-span-2">
            <Input
              type="number"
              inputMode="numeric"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
