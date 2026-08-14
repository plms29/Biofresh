"use client";

import * as React from "react";
import { ArrowLeft, Check, Leaf, Minus, Undo2, X } from "lucide-react";
import {
  SIZE_BAND_LABEL,
  type BuyerSpec,
  type HarvestOrder,
  type PickingEntry,
  type SizeBand,
} from "@/types";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow, useSeed } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import { kg, untilText } from "@/lib/domain/format";
import {
  bandMatchesSpec,
  farmerDayTotal,
  jobsForFarmer,
  pickedByBand,
} from "@/lib/domain/picking";
import { ProductMark } from "@/components/common/product-mark";
import { Meter } from "@/components/ui/meter";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * The picking screen — the one surface a farmer actually touches.
 *
 * Deliberately outside the role shell: no sidebar, no KPI tiles, no alerts,
 * no jargon. It is used one-handed, outdoors, in bright sun, often on a
 * shared phone, sometimes with wet hands. So: three screens at most, targets
 * far above the 44px minimum, weights entered by tapping rather than typing,
 * and every action undoable.
 */
export default function PickPage() {
  useSeed();
  const hydrated = useHydrated();
  const now = useNow();

  const farmers = useBio((s) => s.farmers);
  const harvestOrders = useBio((s) => s.harvestOrders);
  const pickingEntries = useBio((s) => s.pickingEntries);
  const orders = useBio((s) => s.orders);
  const activeFarmerId = useBio((s) => s.activeFarmerId);
  const setActiveFarmer = useBio((s) => s.setActiveFarmer);
  const addPickingEntry = useBio((s) => s.addPickingEntry);
  const removePickingEntry = useBio((s) => s.removePickingEntry);
  const { toast } = useToast();

  const [openJobId, setOpenJobId] = React.useState<string | null>(null);

  const farmer = farmers.find((f) => f.id === activeFarmerId) ?? null;
  const jobs = farmer ? jobsForFarmer(farmer.id, harvestOrders, farmers) : [];
  const openJob = jobs.find((j) => j.id === openJobId) ?? null;

  if (!hydrated) {
    return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  }

  // ---------- Screen 1: who is picking ----------
  if (!farmer) {
    return (
      <Shell>
        <h1 className="mb-1 font-heading text-2xl font-semibold">
          Who is picking?
        </h1>
        <p className="mb-6 text-muted-foreground">Tap your name to start.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {farmers
            .filter((f) => f.active)
            .map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFarmer(f.id)}
                className="flex min-h-20 items-center gap-4 rounded-2xl bg-card px-5 py-4 text-left ring-1 ring-foreground/10 shadow-[var(--shadow-e1)] transition-transform active:scale-[0.98]"
              >
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-leaf-600 font-heading text-lg font-semibold text-white">
                  {f.code}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-lg font-medium">
                    {f.name}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {f.plots[0] ?? "No plot assigned"}
                  </span>
                </span>
              </button>
            ))}
        </div>
      </Shell>
    );
  }

  // ---------- Screen 3: record weight for one job ----------
  if (openJob) {
    return (
      <RecordScreen
        job={openJob}
        farmerId={farmer.id}
        spec={orders.find((o) => o.id === openJob.orderId)?.spec}
        entries={pickingEntries}
        onBack={() => setOpenJobId(null)}
        onAdd={(band, amount) => {
          const res = addPickingEntry({
            harvestOrderId: openJob.id,
            farmerId: farmer.id,
            band,
            kg: amount,
          });
          toast(res.message, res.ok ? "success" : "error");
        }}
        onUndo={(entryId) => {
          removePickingEntry(entryId);
          toast("Removed.", "info");
        }}
      />
    );
  }

  // ---------- Screen 2: today's jobs ----------
  // `now` is non-zero here: the `!hydrated` guard above already returned.
  const dayTotal = farmerDayTotal(farmer.id, pickingEntries, now);

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-leaf-600 font-heading font-semibold text-white">
            {farmer.code}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-medium">{farmer.name}</p>
            <p className="tnum text-sm text-muted-foreground">
              {kg(dayTotal)} picked today
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveFarmer(null)}
          className="shrink-0 rounded-xl px-3 py-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Not you?
        </button>
      </div>

      <h1 className="mb-4 font-heading text-xl font-semibold">Your jobs</h1>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <Leaf className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">Nothing to pick right now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your supervisor will add you to a job when one is ready.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => {
            const meta = PRODUCTS[job.product];
            const pct = job.targetKg > 0 ? (job.pickedKg / job.targetKg) * 100 : 0;
            const late = now > 0 && new Date(job.deadline).getTime() < now;
            return (
              <li key={job.id}>
                <button
                  onClick={() => setOpenJobId(job.id)}
                  className="w-full rounded-2xl bg-card p-5 text-left ring-1 ring-foreground/10 shadow-[var(--shadow-e1)] transition-transform active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ProductMark product={job.product} size="lg" />
                      <div className="min-w-0">
                        <p className="truncate text-lg font-medium">{meta.label}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {job.farm}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "tnum shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                        late
                          ? "bg-risk-100 text-risk-700"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {now ? untilText(job.deadline, now) : "—"}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-baseline justify-between text-sm">
                      <span className="tnum">
                        {kg(job.pickedKg)} of {kg(job.targetKg)}
                      </span>
                      <span className="tnum text-muted-foreground">
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <Meter value={pct} tone={pct >= 100 ? "leaf" : "sun"} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}

/** Full-bleed frame, comfortable on a phone held in one hand. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}

const QUICK_AMOUNTS = [1, 2, 5, 10];

function RecordScreen({
  job,
  farmerId,
  spec,
  entries,
  onBack,
  onAdd,
  onUndo,
}: {
  job: HarvestOrder;
  farmerId: string;
  spec: BuyerSpec | undefined;
  entries: PickingEntry[];
  onBack: () => void;
  onAdd: (band: SizeBand, kg: number) => void;
  onUndo: (entryId: string) => void;
}) {
  const meta = PRODUCTS[job.product];
  const [band, setBand] = React.useState<SizeBand>(meta.sizeBands[0].key);
  const [amount, setAmount] = React.useState(0);

  const byBand = pickedByBand(job.id, job.product, entries);
  const mine = entries
    .filter((e) => e.harvestOrderId === job.id && e.farmerId === farmerId)
    .slice(0, 5);

  return (
    <Shell>
      <button
        onClick={onBack}
        className="mb-5 -ml-2 flex items-center gap-1.5 rounded-xl px-2 py-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> All jobs
      </button>

      <div className="mb-5 flex items-center gap-3">
        <ProductMark product={job.product} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate font-heading text-xl font-semibold">
            {meta.label}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{job.farm}</p>
        </div>
      </div>

      {/* What the buyer wants, in the fewest words that still mean something. */}
      <div className="mb-5 rounded-2xl bg-leaf-50 p-4 ring-1 ring-leaf-200">
        <p className="text-xs font-semibold tracking-wide text-leaf-700 uppercase">
          Pick like this
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {job.guide.doList.slice(0, 3).map((item) => (
            <li key={item} className="flex gap-2 text-sm text-leaf-900/85">
              <Check className="mt-0.5 size-4 shrink-0 text-leaf-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {job.guide.dontList.length > 0 ? (
          <p className="mt-3 flex gap-2 border-t border-leaf-200 pt-3 text-sm text-risk-700">
            <X className="mt-0.5 size-4 shrink-0" />
            <span>{job.guide.dontList[0]}</span>
          </p>
        ) : null}
      </div>

      {/* Step 1 — which size */}
      <p className="mb-2 text-sm font-medium">1. Which size?</p>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {meta.sizeBands.map((def) => {
          const selected = band === def.key;
          const wanted = bandMatchesSpec(def, spec);
          return (
            <button
              key={def.key}
              onClick={() => setBand(def.key)}
              className={cn(
                "flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 ring-1 transition-transform active:scale-[0.97]",
                selected
                  ? "bg-leaf-600 text-white ring-leaf-700"
                  : "bg-card ring-foreground/10"
              )}
            >
              <span className="font-heading text-2xl font-semibold">
                {def.key}
              </span>
              <span
                className={cn(
                  "text-[11px] leading-tight",
                  selected ? "text-white/85" : "text-muted-foreground"
                )}
              >
                {def.hint}
              </span>
              {wanted === true ? (
                <span
                  className={cn(
                    "mt-0.5 rounded-full px-1.5 text-[10px] font-medium",
                    selected ? "bg-white/20 text-white" : "bg-leaf-100 text-leaf-700"
                  )}
                >
                  wanted
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Step 2 — how much */}
      <p className="mb-2 text-sm font-medium">2. How many kg?</p>
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4 ring-1 ring-foreground/10">
        <button
          onClick={() => setAmount((a) => Math.max(0, a - 1))}
          aria-label="One kilogram less"
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted active:scale-95"
        >
          <Minus className="size-5" />
        </button>
        <span className="tnum font-heading text-4xl font-semibold">
          {amount}
          <span className="ml-1 text-lg font-normal text-muted-foreground">kg</span>
        </span>
        <button
          onClick={() => setAmount((a) => a + 1)}
          aria-label="One kilogram more"
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted active:scale-95"
        >
          <span className="text-xl leading-none">+</span>
        </button>
      </div>
      <div className="mb-6 grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((n) => (
          <button
            key={n}
            onClick={() => setAmount((a) => a + n)}
            className="min-h-12 rounded-xl bg-card font-medium ring-1 ring-foreground/10 active:scale-95"
          >
            +{n}
          </button>
        ))}
      </div>

      <button
        disabled={amount <= 0}
        onClick={() => {
          onAdd(band, amount);
          setAmount(0);
        }}
        className="mb-6 min-h-16 w-full rounded-2xl bg-leaf-600 font-heading text-lg font-semibold text-white shadow-[var(--shadow-e2)] transition-transform active:scale-[0.99] disabled:opacity-40"
      >
        Save {amount > 0 ? `${amount} kg` : ""} {SIZE_BAND_LABEL[band].toLowerCase()}
      </button>

      {/* Running totals, so a picker can see the crate count add up. */}
      <div className="mb-6 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Picked on this job
        </p>
        <ul className="flex flex-col gap-2">
          {byBand.map((row) => (
            <li key={row.band} className="flex items-center justify-between gap-3">
              <span className="text-sm">
                {row.label}{" "}
                <span className="text-muted-foreground">· {row.hint}</span>
              </span>
              <span className="tnum font-medium">{kg(row.kg)}</span>
            </li>
          ))}
          <li className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-2">
            <span className="text-sm font-medium">Everyone, total</span>
            <span className="tnum font-heading font-semibold">
              {kg(job.pickedKg)} / {kg(job.targetKg)}
            </span>
          </li>
        </ul>
      </div>

      {mine.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Your last entries
          </p>
          <ul className="flex flex-col gap-2">
            {mine.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10"
              >
                <span className="tnum text-sm">
                  {kg(e.kg)} · {SIZE_BAND_LABEL[e.band]}
                </span>
                <button
                  onClick={() => onUndo(e.id)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground active:scale-95"
                >
                  <Undo2 className="size-4" /> Undo
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Shell>
  );
}
