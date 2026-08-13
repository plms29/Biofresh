"use client";

import * as React from "react";
import { Camera, X } from "lucide-react";
import { GRADE_LABEL, type Batch, type Grade } from "@/types";
import { PRODUCTS } from "@/lib/domain/catalog";
import { kg, vndShort } from "@/lib/domain/format";
import { useBio } from "@/store/use-biofresh";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { ProductLabel } from "@/components/common/product-mark";
import { useToast } from "@/components/ui/toast";

const GRADES: Grade[] = ["A", "B", "PROCESS", "REJECT"];

const HINTS: Record<Grade, string> = {
  A: "Meets the buyer specification; sells fresh at the best price",
  B: "Slight colour or size deviation; still sellable fresh",
  PROCESS: "Processing only (juice, drying)",
  REJECT: "Unusable; discarded",
};

/** Manual entry of the actual grading result — this first release has no machine vision. */
export function QcModal({
  batch,
  onClose,
}: {
  batch: Batch;
  onClose: () => void;
}) {
  const saveQc = useBio((s) => s.saveQc);
  const { toast } = useToast();

  // The modal is mounted per batch, so state is seeded straight from any existing result.
  const [values, setValues] = React.useState<Record<Grade, string>>({
    A: batch.qc ? String(batch.qc.gradeKg.A) : "",
    B: batch.qc ? String(batch.qc.gradeKg.B) : "",
    PROCESS: batch.qc ? String(batch.qc.gradeKg.PROCESS) : "",
    REJECT: batch.qc ? String(batch.qc.gradeKg.REJECT) : "",
  });
  const [notes, setNotes] = React.useState(batch.qc?.notes ?? "");
  const [photos, setPhotos] = React.useState<string[]>(batch.qc?.photos ?? []);
  const [error, setError] = React.useState<string | null>(null);

  const gradeKg = GRADES.reduce(
    (acc, g) => ({ ...acc, [g]: Number(values[g]) || 0 }),
    {} as Record<Grade, number>
  );
  const sum = GRADES.reduce((s, g) => s + gradeKg[g], 0);
  const diff = sum - batch.totalKg;
  const meta = PRODUCTS[batch.product];
  const estValue = GRADES.reduce(
    (s, g) => s + gradeKg[g] * meta.refPrice[g],
    0
  );

  const onPickPhotos = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .slice(0, 3)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () =>
          setPhotos((prev) => [...prev, String(reader.result)].slice(0, 4));
        reader.readAsDataURL(file);
      });
  };

  const submit = () => {
    const res = saveQc(batch.id, gradeKg, notes.trim(), photos);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    toast(res.message);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      className="sm:max-w-xl"
      title={`Grade batch ${batch.id}`}
      description={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <ProductLabel product={batch.product} />
          <span>
            · {batch.origin} · received {kg(batch.totalKg)}
          </span>
        </span>
      }
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={submit}>
            Confirm result
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <p className="rounded-lg bg-risk-100 px-3 py-2 text-sm text-risk-700">
            {error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {GRADES.map((g) => (
            <Field key={g} label={GRADE_LABEL[g]} hint={HINTS[g]}>
              <Input
                type="number"
                inputMode="decimal"
                value={values[g]}
                placeholder="0"
                className="h-12 text-lg"
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [g]: e.target.value }))
                }
              />
            </Field>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/60 px-3.5 py-3 text-sm">
          <span className="tnum">
            Total entered: <strong>{kg(sum)}</strong> / received{" "}
            {kg(batch.totalKg)}
          </span>
          <span
            className={
              Math.abs(diff) < 0.5
                ? "text-leaf-700"
                : "font-medium text-sun-700"
            }
          >
            {Math.abs(diff) < 0.5
              ? "Matches the weight received"
              : diff > 0
                ? `${kg(diff)} over — the entered total will be used as the batch weight`
                : `${kg(-diff)} short of the weight received`}
          </span>
        </div>

        <div className="rounded-xl bg-leaf-50 px-3.5 py-3 text-sm ring-1 ring-leaf-200">
          <p className="tnum text-leaf-800">
            Estimated inventory value after grading:{" "}
            <strong>{vndShort(estValue)}</strong>
          </p>
          <p className="mt-0.5 text-xs text-leaf-700/80">
            Once confirmed, Sales immediately sees {kg(gradeKg.A)} of Grade A and{" "}
            {kg(gradeKg.B)} of Grade B as sellable inventory.
          </p>
        </div>

        <Field label="Quality notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Fruit from the outer rows is undersized, downgraded to Grade B…"
          />
        </Field>

        <div>
          <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Grading photos
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {photos.map((src, i) => (
              <span key={i} className="relative">
                {/* User-selected photos held temporarily as data URLs */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Grading photo ${i + 1}`}
                  className="size-16 rounded-lg object-cover ring-1 ring-foreground/10"
                />
                <button
                  onClick={() =>
                    setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-card p-0.5 ring-1 ring-foreground/15"
                  aria-label="Remove photo"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <label className="flex size-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-input text-muted-foreground transition-colors hover:border-leaf-400 hover:text-leaf-600">
              <Camera className="size-5" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onPickPhotos(e.target.files)}
              />
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
