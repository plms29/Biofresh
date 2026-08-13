"use client";

import * as React from "react";
import {
  CHANNEL_LABEL,
  GRADE_LABEL,
  SALES_CHANNEL_LABEL,
  SELLABLE_GRADES,
  type BuyerSpec,
  type Grade,
  type Order,
  type OrderChannel,
  type ProductKey,
  type SalesChannel,
} from "@/types";
import { PRODUCT_KEYS, PRODUCTS } from "@/lib/domain/catalog";
import { buildPickingGuide } from "@/lib/domain/guide";
import { useBio, type NewOrderInput } from "@/store/use-biofresh";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

const CHANNELS = Object.keys(CHANNEL_LABEL) as OrderChannel[];
const SALES_CHANNELS = Object.keys(SALES_CHANNEL_LABEL) as SalesChannel[];

function isoDateInput(offsetDays: number) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/**
 * Records an order / buyer request. Buyers are not users of the system —
 * Sales re-keys whatever arrives by Zalo, email or phone.
 */
export function OrderFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  /** When provided, the form only edits the specification of an existing order. */
  editing?: Order;
}) {
  const addOrder = useBio((s) => s.addOrder);
  const updateOrderSpec = useBio((s) => s.updateOrderSpec);
  const { toast } = useToast();

  // The modal remounts (by key) on every open, so state is seeded from the order being edited.
  const [buyerName, setBuyerName] = React.useState(editing?.buyerName ?? "");
  const [product, setProduct] = React.useState<ProductKey>(
    editing?.product ?? "strawberry"
  );
  const [qtyKg, setQtyKg] = React.useState(
    editing ? String(editing.qtyKg) : "100"
  );
  const [grade, setGrade] = React.useState<Grade>(editing?.spec.grade ?? "A");
  const [sizeMin, setSizeMin] = React.useState(
    editing?.spec.sizeMinMm ? String(editing.spec.sizeMinMm) : ""
  );
  const [sizeMax, setSizeMax] = React.useState(
    editing?.spec.sizeMaxMm ? String(editing.spec.sizeMaxMm) : ""
  );
  const [colorNote, setColorNote] = React.useState(
    editing?.spec.colorNote ?? ""
  );
  const [brixMin, setBrixMin] = React.useState(
    editing?.spec.brixMin ? String(editing.spec.brixMin) : ""
  );
  const [rejectNotes, setRejectNotes] = React.useState(
    editing?.spec.rejectNotes ?? ""
  );
  const [dueDate, setDueDate] = React.useState(
    editing ? editing.dueDate.slice(0, 10) : isoDateInput(3)
  );
  const [offerPrice, setOfferPrice] = React.useState(
    editing?.offerPrice ? String(editing.offerPrice) : ""
  );
  const [salesChannel, setSalesChannel] = React.useState<SalesChannel>(
    editing?.salesChannel ?? "supermarket"
  );
  const [source, setSource] = React.useState<OrderChannel>(
    editing?.source ?? "zalo"
  );
  const [notes, setNotes] = React.useState(editing?.notes ?? "");
  const [confirmed, setConfirmed] = React.useState(true);
  const [createHo, setCreateHo] = React.useState(true);
  const [farm, setFarm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const spec: BuyerSpec = {
    grade,
    sizeMinMm: sizeMin ? Number(sizeMin) : undefined,
    sizeMaxMm: sizeMax ? Number(sizeMax) : undefined,
    colorNote: colorNote || undefined,
    brixMin: brixMin ? Number(brixMin) : undefined,
    rejectNotes: rejectNotes || undefined,
  };

  // Preview exactly what the field team will receive.
  const preview = buildPickingGuide(product, spec, 0, buyerName || undefined);

  const submit = () => {
    if (editing) {
      updateOrderSpec(editing.id, spec);
      toast(
        `Specification for ${editing.id} updated — the field picking guide is in sync.`
      );
      onClose();
      return;
    }
    if (!buyerName.trim()) return setError("Enter the buyer's name.");
    const qty = Number(qtyKg);
    if (!qty || qty <= 0) return setError("Quantity must be greater than 0.");

    const input: NewOrderInput = {
      buyerName: buyerName.trim(),
      product,
      qtyKg: qty,
      spec,
      dueDate: new Date(`${dueDate}T17:00:00`).toISOString(),
      offerPrice: offerPrice ? Number(offerPrice) : undefined,
      salesChannel,
      source,
      notes: notes.trim() || undefined,
      status: confirmed ? "confirmed" : "draft",
      createHarvestOrder: createHo,
      farm: farm.trim() || undefined,
    };
    const id = addOrder(input);
    toast(
      createHo
        ? `Order ${id} recorded and a harvest order raised for the field team.`
        : `Order ${id} recorded.`
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="sm:max-w-2xl"
      title={editing ? `Update specification ${editing.id}` : "New order"}
      description={
        editing
          ? "Editing the specification updates the picking guide and notifies the field team."
          : "Record the buyer request received by Zalo, email or phone."
      }
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={submit}>
            {editing ? "Save specification" : "Save order"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {error ? (
          <p className="rounded-lg bg-risk-100 px-3 py-2 text-sm text-risk-700">
            {error}
          </p>
        ) : null}

        {!editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Buyer">
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="FreshMart Supermarket"
              />
            </Field>
            <Field label="Source">
              <Select
                value={source}
                onChange={(e) => setSource(e.target.value as OrderChannel)}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Product">
              <Select
                value={product}
                onChange={(e) => setProduct(e.target.value as ProductKey)}
              >
                {PRODUCT_KEYS.map((p) => (
                  <option key={p} value={p}>
                    {PRODUCTS[p].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantity (kg)">
              <Input
                type="number"
                inputMode="decimal"
                value={qtyKg}
                onChange={(e) => setQtyKg(e.target.value)}
              />
            </Field>
            <Field label="Delivery due">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
            <Field
              label="Offered price (VND/kg)"
              hint="Leave empty if the price is not agreed yet."
            >
              <Input
                type="number"
                inputMode="numeric"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="165000"
              />
            </Field>
            <Field label="Sales channel">
              <Select
                value={salesChannel}
                onChange={(e) => setSalesChannel(e.target.value as SalesChannel)}
              >
                {SALES_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {SALES_CHANNEL_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={confirmed ? "confirmed" : "draft"}
                onChange={(e) => setConfirmed(e.target.value === "confirmed")}
              >
                <option value="confirmed">Confirmed with the buyer</option>
                <option value="draft">Draft — awaiting confirmation</option>
              </Select>
            </Field>
          </div>
        ) : null}

        <div className="rounded-xl bg-muted/60 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Buyer specification
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Required grade">
              <Select
                value={grade}
                onChange={(e) => setGrade(e.target.value as Grade)}
              >
                {SELLABLE_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {GRADE_LABEL[g]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Minimum sweetness (Brix)">
              <Input
                type="number"
                inputMode="decimal"
                value={brixMin}
                onChange={(e) => setBrixMin(e.target.value)}
                placeholder="9"
              />
            </Field>
            <Field label="Minimum size (mm)">
              <Input
                type="number"
                inputMode="numeric"
                value={sizeMin}
                onChange={(e) => setSizeMin(e.target.value)}
                placeholder="28"
              />
            </Field>
            <Field label="Maximum size (mm)">
              <Input
                type="number"
                inputMode="numeric"
                value={sizeMax}
                onChange={(e) => setSizeMax(e.target.value)}
                placeholder="40"
              />
            </Field>
            <Field label="Colour / ripeness requirement" className="sm:col-span-2">
              <Input
                value={colorNote}
                onChange={(e) => setColorNote(e.target.value)}
                placeholder="Even red from shoulder to tip, stem still fresh"
              />
            </Field>
            <Field label="Buyer rejects" className="sm:col-span-2">
              <Input
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="bruised fruit, white mould spots, dried stems"
              />
            </Field>
          </div>
        </div>

        {!editing ? (
          <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={createHo}
                onChange={(e) => setCreateHo(e.target.checked)}
                className="mt-0.5 size-4 accent-leaf-600"
              />
              <span>
                Raise a harvest order for the field team straight away
                <span className="block text-xs text-muted-foreground">
                  Picking target = order quantity + 15% to cover grading losses.
                </span>
              </span>
            </label>
            {createHo ? (
              <Field label="Plot / farm household">
                <Input
                  value={farm}
                  onChange={(e) => setFarm(e.target.value)}
                  placeholder="Plot A2 — Tuan household"
                />
              </Field>
            ) : null}
            <Field label="Internal notes">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Deliver in 2 runs, 500 g lidded punnets…"
              />
            </Field>
          </div>
        ) : null}

        <div className="rounded-xl bg-leaf-50 p-4 ring-1 ring-leaf-200">
          <p className="text-xs font-semibold tracking-wide text-leaf-700 uppercase">
            What the field team will see
          </p>
          <p className="mt-2 font-heading text-sm font-semibold">
            {preview.headline}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-leaf-900/80">
            {preview.doList.slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
