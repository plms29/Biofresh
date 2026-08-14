"use client";

import * as React from "react";
import { Check, Plus, Users } from "lucide-react";
import { SIZE_BAND_LABEL, type HarvestOrder, type SizeBand } from "@/types";
import { useBio } from "@/store/use-biofresh";
import { PRODUCTS } from "@/lib/domain/catalog";
import { dt, kg } from "@/lib/domain/format";
import { pickedByBand, tallyByFarmer } from "@/lib/domain/picking";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Select } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * What the Field Supervisor needs on one job: who is on it, what each of them
 * has picked, and the split by size. The supervisor does not pick, so there is
 * no "add 10 kg" button here — weights come from the pickers' own screen. The
 * one exception is `Record for a picker`, for when someone calls a figure in
 * or hands over a paper slip; it still records against a named person so the
 * total and the attribution never come apart.
 */
export function TeamPanel({ job }: { job: HarvestOrder }) {
  const farmers = useBio((s) => s.farmers);
  const entries = useBio((s) => s.pickingEntries);
  const setAssignedFarmers = useBio((s) => s.setAssignedFarmers);
  const addPickingEntry = useBio((s) => s.addPickingEntry);
  const { toast } = useToast();

  const [assignOpen, setAssignOpen] = React.useState(false);
  const [recordOpen, setRecordOpen] = React.useState(false);
  const [recordFarmer, setRecordFarmer] = React.useState("");
  const [recordBand, setRecordBand] = React.useState<SizeBand>("L");
  const [recordKg, setRecordKg] = React.useState("");

  const meta = PRODUCTS[job.product];
  const assigned = farmers.filter((f) => job.assignedFarmerIds.includes(f.id));
  const tallies = tallyByFarmer(job.id, entries, farmers);
  const bands = pickedByBand(job.id, job.product, entries);
  const closed = job.status === "done";

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Who is on the job */}
        <div className="rounded-xl bg-muted/50 px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Picking team
            </p>
            {closed ? null : (
              <Button size="xs" variant="ghost" onClick={() => setAssignOpen(true)}>
                Edit
              </Button>
            )}
          </div>
          {assigned.length === 0 ? (
            <p className="mt-1.5 text-sm text-sun-700">
              Nobody assigned — pickers will not see this job.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {assigned.map((f) => {
                const tally = tallies.find((t) => t.farmer.id === f.id);
                return (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-leaf-600 text-[10px] font-semibold text-white">
                        {f.code}
                      </span>
                      <span className="truncate">{f.name}</span>
                    </span>
                    <span className="tnum shrink-0 text-muted-foreground">
                      {tally ? kg(tally.kg) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Split by size */}
        <div className="rounded-xl bg-muted/50 px-3.5 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            By size
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {bands.map((row) => {
              const share = job.pickedKg > 0 ? (row.kg / job.pickedKg) * 100 : 0;
              return (
                <li key={row.band} className="flex items-center gap-2 text-sm">
                  <span className="w-6 shrink-0 font-medium">{row.band}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <span
                      className="block h-full rounded-full bg-leaf-500"
                      style={{ width: `${share}%` }}
                    />
                  </span>
                  <span className="tnum w-16 shrink-0 text-right text-muted-foreground">
                    {kg(row.kg)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {tallies.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Last entry {dt(tallies.map((t) => t.lastAt).filter(Boolean).sort().at(-1))}
        </p>
      ) : null}

      {closed ? null : (
        <div>
          <Button
            size="lg"
            variant="outline"
            disabled={assigned.length === 0}
            onClick={() => {
              setRecordFarmer(assigned[0]?.id ?? "");
              setRecordBand(meta.sizeBands[0].key);
              setRecordKg("");
              setRecordOpen(true);
            }}
          >
            <Plus /> Record for a picker
          </Button>
        </div>
      )}

      {/* Assign the team */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={`Picking team — ${job.id}`}
        description="Only the people you choose here will see this job on their phone."
        footer={
          <Button size="lg" onClick={() => setAssignOpen(false)}>
            Done
          </Button>
        }
      >
        <ul className="flex flex-col gap-2">
          {farmers
            .filter((f) => f.active)
            .map((f) => {
              const on = job.assignedFarmerIds.includes(f.id);
              return (
                <li key={f.id}>
                  <button
                    onClick={() =>
                      setAssignedFarmers(
                        job.id,
                        on
                          ? job.assignedFarmerIds.filter((id) => id !== f.id)
                          : [...job.assignedFarmerIds, f.id]
                      )
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left ring-1 transition-colors",
                      on
                        ? "bg-leaf-50 ring-leaf-300"
                        : "bg-card ring-foreground/10 hover:bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        on ? "bg-leaf-600 text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {f.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{f.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {f.plots.join(" · ") || "No usual plot"}
                      </span>
                    </span>
                    {on ? <Check className="size-4 shrink-0 text-leaf-600" /> : null}
                  </button>
                </li>
              );
            })}
        </ul>
      </Modal>

      {/* Record on someone's behalf */}
      <Modal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        title="Record for a picker"
        description="Use this when a weight is called in or written on a slip. It is still recorded against that person."
        footer={
          <>
            <Button variant="outline" size="lg" onClick={() => setRecordOpen(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={() => {
                const res = addPickingEntry({
                  harvestOrderId: job.id,
                  farmerId: recordFarmer,
                  band: recordBand,
                  kg: Number(recordKg) || 0,
                });
                toast(res.message, res.ok ? "success" : "error");
                if (res.ok) setRecordOpen(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Picker">
            <Select
              value={recordFarmer}
              onChange={(e) => setRecordFarmer(e.target.value)}
            >
              {assigned.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Size">
            <Select
              value={recordBand}
              onChange={(e) => setRecordBand(e.target.value as SizeBand)}
            >
              {meta.sizeBands.map((def) => (
                <option key={def.key} value={def.key}>
                  {SIZE_BAND_LABEL[def.key]} — {def.hint}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kilograms">
            <Input
              type="number"
              inputMode="decimal"
              value={recordKg}
              onChange={(e) => setRecordKg(e.target.value)}
              className="h-12 text-lg"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

/** Roster summary for the top of the Field screen. */
export function TeamSummary() {
  const farmers = useBio((s) => s.farmers);
  const active = farmers.filter((f) => f.active);
  return (
    <span className="inline-flex items-center gap-1.5">
      <Users className="size-4" /> {active.length}
    </span>
  );
}
