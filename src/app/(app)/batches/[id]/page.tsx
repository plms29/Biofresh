"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, Boxes, ExternalLink } from "lucide-react";
import {
  BATCH_STATUS_LABEL,
  BATCH_STATUS_ORDER,
  GRADE_LABEL,
  type Grade,
} from "@/types";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import { batchLots } from "@/lib/domain/inventory";
import { full, kg, untilText, vnd, vndShort } from "@/lib/domain/format";
import { DataRow, EmptyState, PageHeader, SectionTitle } from "@/components/common/layout-bits";
import {
  AllocationStatusTag,
  BatchStatusTag,
  GradeTag,
} from "@/components/common/badges";
import { QrCode } from "@/components/common/qr-code";
import { ProductLabel } from "@/components/common/product-mark";
import { ProtocolTracker } from "@/components/packhouse/protocol-tracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GRADES: Grade[] = ["A", "B", "PROCESS", "REJECT"];

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const batchId = decodeURIComponent(params.id);
  const hydrated = useHydrated();
  const now = useNow();

  const batch = useBio((s) => s.batches.find((b) => b.id === batchId));
  const allocations = useBio((s) => s.allocations);
  const orders = useBio((s) => s.orders);
  const cases = useBio((s) => s.cases);
  const harvestOrders = useBio((s) => s.harvestOrders);

  if (!hydrated) return null;

  // `window` only exists after hydration — the QR code needs a full URL to scan.
  const passportUrl = `${window.location.origin}/p/${encodeURIComponent(batchId)}`;

  if (!batch) {
    return (
      <div className="flex flex-col gap-6">
        <Button variant="ghost" asChild className="w-fit">
          <Link href="/batches">
            <ArrowLeft /> All batches
          </Link>
        </Button>
        <EmptyState
          icon={Boxes}
          title={`Batch ${batchId} not found`}
          hint="It may have been removed when the demo data was reset."
        />
      </div>
    );
  }

  const meta = PRODUCTS[batch.product];
  const lots = batchLots(batch, allocations);
  const batchAllocs = allocations.filter((a) => a.batchId === batch.id);
  const ho = harvestOrders.find((h) => h.id === batch.harvestOrderId);
  const batchCases = cases.filter((c) => c.batchId === batch.id);
  const currentStep = BATCH_STATUS_ORDER.indexOf(batch.status);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" asChild className="w-fit">
        <Link href="/batches">
          <ArrowLeft /> All batches
        </Link>
      </Button>

      <PageHeader
        eyebrow={meta.label}
        title={batch.id}
        description={`${batch.origin} · harvested ${full(batch.harvestedAt)}${
          ho ? ` · harvest order ${ho.id}` : ""
        }`}
        actions={
          <Button variant="outline" size="lg" asChild>
            <Link href={`/p/${encodeURIComponent(batch.id)}`} target="_blank">
              <BadgeCheck /> Process Passport
            </Link>
          </Button>
        }
      />

      {/* Status journey */}
      <Card>
        <CardContent>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {BATCH_STATUS_ORDER.map((s, i) => {
              const done = i <= currentStep;
              return (
                <li key={s} className="flex flex-col gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 rounded-full",
                      done ? "bg-leaf-500" : "bg-muted"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs",
                      done ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {BATCH_STATUS_LABEL[s]}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <BatchStatusTag status={batch.status} />
            <span className="tnum text-sm text-muted-foreground">
              {kg(batch.totalKg)} · intake {full(batch.intakeAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Quality control result */}
          <Card>
            <CardHeader className="border-b">
              <SectionTitle
                title="Quality control result"
                hint={
                  batch.qc
                    ? `${batch.qc.confirmedBy} · ${full(batch.qc.confirmedAt)}`
                    : "The packhouse has not confirmed a grading result yet."
                }
              />
            </CardHeader>
            <CardContent>
              {!batch.qc ? (
                <EmptyState
                  title="No grading result yet"
                  hint="Inventory only appears once the packhouse confirms the kg in each grade."
                />
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-4">
                    {GRADES.map((g) => {
                      const lot = lots.find((l) => l.grade === g);
                      return (
                        <div
                          key={g}
                          className="rounded-xl bg-muted/50 px-3 py-2.5"
                        >
                          <GradeTag grade={g} />
                          <p className="tnum mt-1.5 font-heading text-base font-semibold">
                            {kg(batch.qc!.gradeKg[g])}
                          </p>
                          {lot && g !== "REJECT" ? (
                            <p className="tnum text-xs text-muted-foreground">
                              {kg(lot.availableKg)} left
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  {batch.qc.notes ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Notes: {batch.qc.notes}
                    </p>
                  ) : null}
                  {batch.qc.photos.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {batch.qc.photos.map((src, i) => (
                        // Photos uploaded by the packhouse, stored as data URLs
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt={`Grading photo ${i + 1}`}
                          className="size-20 rounded-lg object-cover ring-1 ring-foreground/10"
                        />
                      ))}
                    </div>
                  ) : null}
                  {/* The action deadline only matters while the batch is neither shipped nor closed and still has unallocated stock. */}
                  {lots.some((l) => l.grade !== "REJECT" && l.availableKg > 0) &&
                  batch.status !== "closed" &&
                  batch.status !== "shipped" &&
                  now > 0 ? (
                    <p className="mt-3 text-sm text-sun-700">
                      Action deadline: {untilText(lots[0].actionDeadline, now)} (
                      {meta.actionWindowHours} hours after quality control).
                    </p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          {/* Field Protocol */}
          <Card>
            <CardHeader className="border-b">
              <SectionTitle
                title="BioFresh Field Protocol"
                hint="Six mandatory steps — the only content a buyer sees when they scan the QR code."
              />
            </CardHeader>
            <CardContent>
              <ProtocolTracker
                batch={batch}
                readOnly={batch.status === "closed"}
              />
            </CardContent>
          </Card>

          {/* Allocations */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Allocations</CardTitle>
            </CardHeader>
            <CardContent>
              {batchAllocs.length === 0 ? (
                <EmptyState
                  title="Nothing allocated"
                  hint="Sales allocates sub-lots to orders or to a sales channel."
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {batchAllocs.map((a) => {
                    const order = orders.find((o) => o.id === a.orderId);
                    return (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3.5 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{a.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {GRADE_LABEL[a.grade]} · {a.createdBy}
                            {order ? ` · order ${order.id}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="tnum font-medium">{kg(a.kg)}</span>
                          <AllocationStatusTag status={a.status} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Surplus decision cases */}
          {batchCases.length > 0 ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Decision cases</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 text-sm">
                  {batchCases.map((c) => {
                    const chosen = c.options.find(
                      (o) => o.id === c.chosenOptionId
                    );
                    return (
                      <li
                        key={c.id}
                        className="rounded-xl bg-muted/50 px-3.5 py-3"
                      >
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          <GradeTag grade={c.grade} />
                          {kg(c.unallocatedKg)} unallocated
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {chosen
                            ? `Decided: ${chosen.label} · expected value ${vndShort(
                                chosen.netValue
                              )} · ${c.decidedBy}`
                            : "Waiting for the Manager to choose an option."}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/manager">
                    Open the Decision Room <ExternalLink className="size-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right column: QR code and batch details */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Batch QR code</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <QrCode value={passportUrl} />
              <p className="text-center text-xs text-muted-foreground">
                Scanning the code shows a buyer the Process Passport only. No
                prices, no inventory, no internal data.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/p/${encodeURIComponent(batch.id)}`} target="_blank">
                  Open as a buyer
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Batch details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                <DataRow label="Product">
                  <ProductLabel product={batch.product} />
                </DataRow>
                <DataRow label="Origin">{batch.origin}</DataRow>
                <DataRow label="Harvested">{full(batch.harvestedAt)}</DataRow>
                <DataRow label="Intake">{full(batch.intakeAt)}</DataRow>
                <DataRow label="Total weight">{kg(batch.totalKg)}</DataRow>
                {ho ? (
                  <DataRow label="Harvest order">
                    {ho.id} · {kg(ho.pickedKg)}
                  </DataRow>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {batch.outcome ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Final result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  <DataRow label="Shipped">{kg(batch.outcome.shippedKg)}</DataRow>
                  <DataRow label="Accepted by buyer">
                    {kg(batch.outcome.acceptedKg)}
                  </DataRow>
                  <DataRow label="Rejected by buyer">
                    {kg(batch.outcome.rejectedKg)}
                  </DataRow>
                  <DataRow label="Actual revenue">
                    {vnd(batch.outcome.actualRevenue)}
                  </DataRow>
                  <DataRow label="Closed">{full(batch.outcome.closedAt)}</DataRow>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
