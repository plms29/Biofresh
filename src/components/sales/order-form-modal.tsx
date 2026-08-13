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
 * Nhập đơn hàng / yêu cầu khách mua. Khách mua không dùng hệ thống —
 * Bán hàng gõ lại thông tin nhận qua Zalo, thư điện tử, điện thoại.
 */
export function OrderFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  /** Khi truyền vào: chỉ sửa tiêu chuẩn của đơn hiện có. */
  editing?: Order;
}) {
  const addOrder = useBio((s) => s.addOrder);
  const updateOrderSpec = useBio((s) => s.updateOrderSpec);
  const { toast } = useToast();

  // Hộp thoại được gắn lại (theo key) mỗi lần mở nên khởi tạo trực tiếp từ đơn đang sửa.
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

  // Xem trước đúng thứ mà ngoài vườn sẽ nhận được.
  const preview = buildPickingGuide(product, spec, 0, buyerName || undefined);

  const submit = () => {
    if (editing) {
      updateOrderSpec(editing.id, spec);
      toast(
        `Đã cập nhật tiêu chuẩn ${editing.id} — hướng dẫn hái ngoài vườn đã đồng bộ.`
      );
      onClose();
      return;
    }
    if (!buyerName.trim()) return setError("Nhập tên khách mua.");
    const qty = Number(qtyKg);
    if (!qty || qty <= 0) return setError("Số lượng phải lớn hơn 0.");

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
        ? `Đã nhập đơn ${id} và tạo lệnh thu hoạch cho ngoài vườn.`
        : `Đã nhập đơn ${id}.`
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="sm:max-w-2xl"
      title={editing ? `Cập nhật tiêu chuẩn ${editing.id}` : "Nhập đơn hàng mới"}
      description={
        editing
          ? "Sửa tiêu chuẩn sẽ tự cập nhật hướng dẫn hái và thông báo cho ngoài vườn."
          : "Ghi lại yêu cầu khách mua gửi qua Zalo, thư điện tử hoặc điện thoại."
      }
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            Huỷ
          </Button>
          <Button size="lg" onClick={submit}>
            {editing ? "Lưu tiêu chuẩn" : "Lưu đơn hàng"}
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
            <Field label="Khách mua">
              <Input
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Siêu thị FreshMart"
              />
            </Field>
            <Field label="Nguồn thông tin">
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
            <Field label="Số lượng (kg)">
              <Input
                type="number"
                inputMode="decimal"
                value={qtyKg}
                onChange={(e) => setQtyKg(e.target.value)}
              />
            </Field>
            <Field label="Hạn giao">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
            <Field label="Giá chào (VND/kg)" hint="Để trống nếu chưa chốt giá.">
              <Input
                type="number"
                inputMode="numeric"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="165000"
              />
            </Field>
            <Field label="Kênh bán">
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
            <Field label="Trạng thái">
              <Select
                value={confirmed ? "confirmed" : "draft"}
                onChange={(e) => setConfirmed(e.target.value === "confirmed")}
              >
                <option value="confirmed">Đã chốt với khách mua</option>
                <option value="draft">Nháp — chờ xác nhận</option>
              </Select>
            </Field>
          </div>
        ) : null}

        <div className="rounded-xl bg-muted/60 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Tiêu chuẩn khách mua
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Hạng yêu cầu">
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
            <Field label="Độ ngọt tối thiểu (Brix)">
              <Input
                type="number"
                inputMode="decimal"
                value={brixMin}
                onChange={(e) => setBrixMin(e.target.value)}
                placeholder="9"
              />
            </Field>
            <Field label="Kích thước nhỏ nhất (mm)">
              <Input
                type="number"
                inputMode="numeric"
                value={sizeMin}
                onChange={(e) => setSizeMin(e.target.value)}
                placeholder="28"
              />
            </Field>
            <Field label="Kích thước lớn nhất (mm)">
              <Input
                type="number"
                inputMode="numeric"
                value={sizeMax}
                onChange={(e) => setSizeMax(e.target.value)}
                placeholder="40"
              />
            </Field>
            <Field label="Yêu cầu màu / độ chín" className="sm:col-span-2">
              <Input
                value={colorNote}
                onChange={(e) => setColorNote(e.target.value)}
                placeholder="Đỏ đều từ vai xuống chóp, cuống còn tươi"
              />
            </Field>
            <Field label="Khách mua từ chối" className="sm:col-span-2">
              <Input
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="trái dập, đốm nấm trắng, cuống khô"
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
                Tạo luôn lệnh thu hoạch cho ngoài vườn
                <span className="block text-xs text-muted-foreground">
                  Mục tiêu hái = số lượng đơn + 15% bù hao hụt phân loại.
                </span>
              </span>
            </label>
            {createHo ? (
              <Field label="Vườn / nông hộ">
                <Input
                  value={farm}
                  onChange={(e) => setFarm(e.target.value)}
                  placeholder="Vườn A2 — hộ ông Tuấn"
                />
              </Field>
            ) : null}
            <Field label="Ghi chú nội bộ">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Giao 2 chuyến, thùng 500 g có nắp…"
              />
            </Field>
          </div>
        ) : null}

        <div className="rounded-xl bg-leaf-50 p-4 ring-1 ring-leaf-200">
          <p className="text-xs font-semibold tracking-wide text-leaf-700 uppercase">
            Ngoài vườn sẽ thấy
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
