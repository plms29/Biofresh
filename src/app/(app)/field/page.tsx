"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CircleDot,
  Minus,
  PackageX,
  RefreshCw,
  Smartphone,
  Sprout,
  Timer,
} from "lucide-react";
import { HARVEST_STATUS_LABEL, type HarvestOrder } from "@/types";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import { dt, kg, untilText } from "@/lib/domain/format";
import { EmptyState, Kpi, PageHeader } from "@/components/common/layout-bits";
import { TeamPanel } from "@/components/field/team-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function FieldPage() {
  const hydrated = useHydrated();
  const now = useNow();
  const harvestOrders = useBio((s) => s.harvestOrders);
  const orders = useBio((s) => s.orders);
  const startHarvest = useBio((s) => s.startHarvest);
  const finishHarvest = useBio((s) => s.finishHarvest);
  const reportIncident = useBio((s) => s.reportIncident);
  const { toast } = useToast();

  const [incidentFor, setIncidentFor] = React.useState<HarvestOrder | null>(null);
  const [incidentNote, setIncidentNote] = React.useState("");

  const active = harvestOrders
    .filter((h) => h.status !== "done")
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const done = harvestOrders.filter((h) => h.status === "done").slice(0, 4);
  const targetKg = active.reduce((s, h) => s + h.targetKg, 0);
  const pickedKg = active.reduce((s, h) => s + h.pickedKg, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Today's harvest"
        title="Pick to the buyer's standard"
        description="Put a team on each job, and the weights they record at the plot land here, in the packhouse and on the Sales desk straight away."
        actions={
          <Button variant="outline" size="lg" asChild>
            <Link href="/pick" target="_blank">
              <Smartphone /> Open the picking screen
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi
          label="Open harvest orders"
          value={hydrated ? active.length : "—"}
          sub={`${active.filter((h) => h.status === "in_progress").length} being picked`}
          icon={Sprout}
        />
        <Kpi
          label="Target today"
          value={hydrated ? kg(targetKg) : "—"}
          tone="leaf"
          icon={CircleDot}
        />
        <Kpi
          label="Picked"
          value={hydrated ? kg(pickedKg) : "—"}
          sub={targetKg > 0 ? `${Math.round((pickedKg / targetKg) * 100)}% of target` : undefined}
          tone="sun"
          icon={Timer}
        />
      </div>

      {!hydrated ? null : active.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No harvest orders"
          hint="Sales raises a harvest order whenever a new order comes in. The picking guide will appear right here."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {active.map((ho) => {
            const order = orders.find((o) => o.id === ho.orderId);
            const late = now > 0 && new Date(ho.deadline).getTime() < now;
            const pct = (ho.pickedKg / ho.targetKg) * 100;
            return (
              <Card key={ho.id}>
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{ho.guide.headline}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ho.id} · {ho.farm}
                        {order ? ` · order ${order.id}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                          ho.status === "in_progress"
                            ? "bg-sun-100 text-sun-700 ring-sun-300"
                            : "bg-muted text-muted-foreground ring-border"
                        )}
                      >
                        {HARVEST_STATUS_LABEL[ho.status]}
                      </span>
                      <span
                        className={cn(
                          "tnum text-xs",
                          late ? "font-medium text-risk-700" : "text-muted-foreground"
                        )}
                      >
                        Deadline: {now ? untilText(ho.deadline, now) : "—"}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  {/* Raised by the packhouse because a graded batch fell short
                      of this order — the field sees why, not just a new job. */}
                  {ho.guide.corrective ? (
                    <div className="flex items-start gap-2 rounded-xl bg-risk-100/70 px-3.5 py-2.5 text-sm text-risk-700 ring-1 ring-risk-300/60">
                      <PackageX className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Corrective pick. Batch {ho.guide.corrective.batchId}{" "}
                        graded {kg(ho.guide.corrective.shortfallKg)} short of
                        this order, so it has come back to the field. Target{" "}
                        {kg(ho.targetKg)}.
                      </span>
                    </div>
                  ) : null}

                  {ho.guide.revision > 0 ? (
                    <div className="flex items-start gap-2 rounded-xl bg-sun-100 px-3.5 py-2.5 text-sm text-sun-700">
                      <RefreshCw className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Sales has updated the specification (revision{" "}
                        {ho.guide.revision}). Read the guide below again before
                        you carry on picking.
                      </span>
                    </div>
                  ) : null}

                  {/* Visual picking guide */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-leaf-50 p-4 ring-1 ring-leaf-200">
                      <p className="text-xs font-semibold tracking-wide text-leaf-700 uppercase">
                        Pick like this
                      </p>
                      <ul className="mt-2 flex flex-col gap-2">
                        {ho.guide.doList.map((item) => (
                          <li key={item} className="flex gap-2 text-sm text-leaf-900/85">
                            <Check className="mt-0.5 size-4 shrink-0 text-leaf-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl bg-risk-100/70 p-4 ring-1 ring-risk-300/60">
                      <p className="text-xs font-semibold tracking-wide text-risk-700 uppercase">
                        Never do this
                      </p>
                      <ul className="mt-2 flex flex-col gap-2">
                        {ho.guide.dontList.map((item) => (
                          <li key={item} className="flex gap-2 text-sm text-risk-700/90">
                            <Minus className="mt-0.5 size-4 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="tnum text-sm">
                        Picked {kg(ho.pickedKg)} / {kg(ho.targetKg)}
                      </span>
                      <span className="tnum text-sm text-muted-foreground">
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <Meter value={pct} tone={pct >= 100 ? "leaf" : "sun"} />
                  </div>

                  {/* Weights come from the pickers' own screen; the supervisor
                      assigns the team and watches it add up. */}
                  <TeamPanel job={ho} />

                  <div className="flex flex-wrap gap-2">
                    {ho.status === "pending" ? (
                      <Button
                        size="lg"
                        onClick={() => {
                          startHarvest(ho.id);
                          toast(`Started harvest order ${ho.id}.`);
                        }}
                      >
                        Start picking
                      </Button>
                    ) : null}
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        setIncidentFor(ho);
                        setIncidentNote("");
                      }}
                    >
                      <AlertTriangle /> Report an incident
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      disabled={ho.pickedKg <= 0}
                      onClick={() => {
                        const id = finishHarvest(ho.id);
                        toast(
                          `Sent ${kg(ho.pickedKg)} to the packhouse — batch ${id} is awaiting intake.`
                        );
                      }}
                    >
                      Finished, send to packhouse
                    </Button>
                  </div>

                  {ho.incidents.length > 0 ? (
                    <div className="rounded-xl bg-muted/50 px-3.5 py-3">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Incidents reported
                      </p>
                      <ul className="mt-1.5 flex flex-col gap-1.5 text-sm">
                        {ho.incidents.map((i) => (
                          <li key={i.id}>
                            <span className="text-muted-foreground">{dt(i.at)}</span>{" "}
                            — {i.note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {hydrated && done.length > 0 ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Finished harvest orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {done.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3">
                  <span>
                    {h.id} · {PRODUCTS[h.product].label} · {h.farm}
                  </span>
                  <span className="tnum text-muted-foreground">
                    {kg(h.pickedKg)} · {dt(h.finishedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Report an incident */}
      <Modal
        open={incidentFor !== null}
        onClose={() => setIncidentFor(null)}
        title={`Report an incident — ${incidentFor?.id ?? ""}`}
        description="The packhouse and the manager will see this note immediately."
        footer={
          <>
            <Button variant="outline" size="lg" onClick={() => setIncidentFor(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={() => {
                if (!incidentFor || !incidentNote.trim()) return;
                reportIncident(incidentFor.id, incidentNote.trim());
                toast("Incident reported.", "info");
                setIncidentFor(null);
              }}
            >
              Send
            </Button>
          </>
        }
      >
        <Field label="What is happening?">
          <Textarea
            value={incidentNote}
            onChange={(e) => setIncidentNote(e.target.value)}
            placeholder="Frost damage on the last row, fruit smaller than the specification…"
          />
        </Field>
      </Modal>

    </div>
  );
}
