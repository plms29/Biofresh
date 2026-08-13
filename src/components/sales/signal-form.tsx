"use client";

import * as React from "react";
import {
  CHANNEL_LABEL,
  GRADE_LABEL,
  type Grade,
  type OrderChannel,
  type ProductKey,
} from "@/types";
import { PRODUCT_KEYS, PRODUCTS } from "@/lib/domain/catalog";
import { useBio } from "@/store/use-biofresh";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

const GRADES: Grade[] = ["A", "B", "PROCESS"];

/** Records the market demand and prices Sales hears about — the data behind the Decision Room. */
export function SignalFormModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addSignal = useBio((s) => s.addSignal);
  const { toast } = useToast();

  const [market, setMarket] = React.useState("");
  const [product, setProduct] = React.useState<ProductKey>("strawberry");
  const [grade, setGrade] = React.useState<Grade>("B");
  const [qtyKg, setQtyKg] = React.useState("100");
  const [price, setPrice] = React.useState("");
  const [validDays, setValidDays] = React.useState("2");
  const [source, setSource] = React.useState<OrderChannel>("phone");
  const [error, setError] = React.useState<string | null>(null);

  const submit = () => {
    if (!market.trim()) return setError("Enter the buyer or market name.");
    const qty = Number(qtyKg);
    const p = Number(price);
    if (!qty || qty <= 0) return setError("Quantity must be greater than 0.");
    if (!p || p <= 0) return setError("Enter the price or the quote.");
    addSignal({
      market: market.trim(),
      product,
      grade,
      qtyKg: qty,
      price: p,
      validUntil: new Date(
        Date.now() + Math.max(1, Number(validDays) || 1) * 86_400_000
      ).toISOString(),
      source,
    });
    toast("Market signal recorded — the Decision Room will use these figures.");
    setMarket("");
    setPrice("");
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a market signal"
      description="The quantity currently wanted and the price heard from a buyer or wholesale market."
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={submit}>
            Save signal
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
        <Field label="Buyer / market">
          <Input
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder="Binh Dien Wholesale Market"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Field label="Grade">
            <Select
              value={grade}
              onChange={(e) => setGrade(e.target.value as Grade)}
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABEL[g]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity wanted (kg)">
            <Input
              type="number"
              inputMode="decimal"
              value={qtyKg}
              onChange={(e) => setQtyKg(e.target.value)}
            />
          </Field>
          <Field label="Price / quote (VND/kg)">
            <Input
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="112000"
            />
          </Field>
          <Field label="Valid for (days)">
            <Input
              type="number"
              inputMode="numeric"
              value={validDays}
              onChange={(e) => setValidDays(e.target.value)}
            />
          </Field>
          <Field label="Source">
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value as OrderChannel)}
            >
              {(Object.keys(CHANNEL_LABEL) as OrderChannel[]).map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
