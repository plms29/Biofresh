"use client";

import * as React from "react";
import {
  GRADE_LABEL,
  SALES_CHANNEL_LABEL,
  type Grade,
  type SalesChannel,
} from "@/types";
import { PRODUCTS } from "@/lib/domain/catalog";
import { batchLots } from "@/lib/domain/inventory";
import { kg, untilText } from "@/lib/domain/format";
import { useBio } from "@/store/use-biofresh";
import { useNow } from "@/hooks/use-client-state";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select } from "@/components/ui/field";
import { GradeTag } from "@/components/common/badges";
import { useToast } from "@/components/ui/toast";

export interface AllocateTarget {
  /** Phân bổ cho một đơn hàng cụ thể. */
  orderId?: string;
  /** Hoặc phân bổ trực tiếp cho một kênh bán (xử lý hàng dư thừa). */
  channel?: SalesChannel;
  label: string;
  /** Giới hạn hạng cần dùng (theo tiêu chuẩn đơn hàng). */
  grade?: Grade;
  /** Số kg còn thiếu — dùng làm giá trị gợi ý. */
  suggestKg?: number;
  /** Cố định lô nếu mở từ màn hình lô hàng. */
  batchId?: string;
}

/** Phân bổ kg từ một lô con đã kiểm soát chất lượng cho đơn hàng hoặc kênh bán. */
export function AllocateModal({
  onClose,
  target,
}: {
  onClose: () => void;
  target: AllocateTarget;
}) {
  const batches = useBio((s) => s.batches);
  const allocations = useBio((s) => s.allocations);
  const orders = useBio((s) => s.orders);
  const allocate = useBio((s) => s.allocate);
  const { toast } = useToast();
  const now = useNow();

  const order = target.orderId
    ? orders.find((o) => o.id === target.orderId)
    : undefined;

  const lots = React.useMemo(() => {
    const openBatches = batches.filter((b) => b.status !== "closed" && b.qc);
    return openBatches
      .flatMap((b) => batchLots(b, allocations))
      .filter((l) => l.availableKg > 0)
      .filter((l) => (target.grade ? l.grade === target.grade : true))
      .filter((l) => (order ? l.product === order.product : true))
      .filter((l) => (target.batchId ? l.batchId === target.batchId : true))
      .sort((a, b) => a.actionDeadline.localeCompare(b.actionDeadline));
  }, [batches, allocations, target, order]);

  // Hộp thoại chỉ được gắn khi mở, nên khởi tạo trực tiếp từ lô con phù hợp đầu tiên.
  const firstLot = lots[0];
  const [lotKey, setLotKey] = React.useState(
    firstLot ? `${firstLot.batchId}|${firstLot.grade}` : ""
  );
  const [amount, setAmount] = React.useState(() => {
    if (!firstLot) return "";
    const suggested = target?.suggestKg
      ? Math.min(target.suggestKg, firstLot.availableKg)
      : firstLot.availableKg;
    return String(Math.round(suggested));
  });
  const [channel, setChannel] = React.useState<SalesChannel>(
    target?.channel ?? "wholesale"
  );
  const [error, setError] = React.useState<string | null>(null);

  const selected = lots.find((l) => `${l.batchId}|${l.grade}` === lotKey);

  const submit = () => {
    if (!selected) return setError("Chọn lô con để phân bổ.");
    const value = Number(amount);
    if (!value || value <= 0) return setError("Nhập số kg lớn hơn 0.");
    const res = allocate({
      batchId: selected.batchId,
      grade: selected.grade,
      kg: value,
      orderId: target.orderId,
      channel: target.orderId ? order?.salesChannel : channel,
      label: target.orderId
        ? target.label
        : `${target.label} — ${SALES_CHANNEL_LABEL[channel]}`,
    });
    if (!res.ok) return setError(res.message);
    toast(res.message);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Phân bổ hàng"
      description={
        target.orderId
          ? `Cho đơn ${target.orderId} — ${target.label}`
          : target.label
      }
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            Huỷ
          </Button>
          <Button size="lg" onClick={submit} disabled={lots.length === 0}>
            Phân bổ
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

        {lots.length === 0 ? (
          <p className="rounded-lg bg-sun-100 px-3 py-2.5 text-sm text-sun-700">
            Không có lô con khả dụng phù hợp. Cần chờ kho đóng gói xác nhận phân
            loại hoặc tạo thêm lệnh thu hoạch.
          </p>
        ) : (
          <>
            <Field label="Lô con khả dụng">
              <Select value={lotKey} onChange={(e) => setLotKey(e.target.value)}>
                {lots.map((l) => (
                  <option
                    key={`${l.batchId}|${l.grade}`}
                    value={`${l.batchId}|${l.grade}`}
                  >
                    {l.batchId} · {GRADE_LABEL[l.grade]} ·{" "}
                    {PRODUCTS[l.product].label} · còn {l.availableKg} kg
                  </option>
                ))}
              </Select>
            </Field>

            {selected ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3.5 py-3 text-sm">
                <div>
                  <p className="font-medium">{selected.batchId}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.origin}
                  </p>
                </div>
                <div className="text-right">
                  <GradeTag grade={selected.grade} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    hạn hành động{" "}
                    {now ? untilText(selected.actionDeadline, now) : "—"}
                  </p>
                </div>
              </div>
            ) : null}

            <Field
              label="Số kg phân bổ"
              hint={
                selected
                  ? `Tối đa ${kg(selected.availableKg)} ở lô con này.`
                  : undefined
              }
            >
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>

            {!target.orderId ? (
              <Field label="Kênh bán">
                <Select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as SalesChannel)}
                >
                  {(Object.keys(SALES_CHANNEL_LABEL) as SalesChannel[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {SALES_CHANNEL_LABEL[c]}
                      </option>
                    )
                  )}
                </Select>
              </Field>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
