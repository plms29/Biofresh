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

/** Ghi nhận nhu cầu/giá thị trường mà Bán hàng nghe được — nguồn số liệu cho Phòng quyết định. */
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
    if (!market.trim()) return setError("Nhập tên khách mua / thị trường.");
    const qty = Number(qtyKg);
    const p = Number(price);
    if (!qty || qty <= 0) return setError("Số lượng phải lớn hơn 0.");
    if (!p || p <= 0) return setError("Nhập giá hoặc báo giá.");
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
    toast("Đã nhập tín hiệu thị trường — Phòng quyết định sẽ dùng số liệu này.");
    setMarket("");
    setPrice("");
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nhập tín hiệu thị trường"
      description="Số lượng đang cần và giá nghe được từ khách mua hoặc chợ đầu mối."
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            Huỷ
          </Button>
          <Button size="lg" onClick={submit}>
            Lưu tín hiệu
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
        <Field label="Khách mua / thị trường">
          <Input
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder="Chợ đầu mối Bình Điền"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sản phẩm">
            <Select
              value={product}
              onChange={(e) => setProduct(e.target.value as ProductKey)}
            >
              {PRODUCT_KEYS.map((p) => (
                <option key={p} value={p}>
                  {PRODUCTS[p].emoji} {PRODUCTS[p].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hạng">
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
          <Field label="Số lượng đang cần (kg)">
            <Input
              type="number"
              inputMode="decimal"
              value={qtyKg}
              onChange={(e) => setQtyKg(e.target.value)}
            />
          </Field>
          <Field label="Giá / báo giá (VND/kg)">
            <Input
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="112000"
            />
          </Field>
          <Field label="Thời hạn hiệu lực (ngày)">
            <Input
              type="number"
              inputMode="numeric"
              value={validDays}
              onChange={(e) => setValidDays(e.target.value)}
            />
          </Field>
          <Field label="Nguồn">
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
