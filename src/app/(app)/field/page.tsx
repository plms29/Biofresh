"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  CircleDot,
  Minus,
  Plus,
  RefreshCw,
  Sprout,
  Timer,
} from "lucide-react";
import { HARVEST_STATUS_LABEL, type HarvestOrder } from "@/types";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import { dt, kg, untilText } from "@/lib/domain/format";
import { EmptyState, Kpi, PageHeader } from "@/components/common/layout-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function FieldPage() {
  const hydrated = useHydrated();
  const now = useNow();
  const harvestOrders = useBio((s) => s.harvestOrders);
  const orders = useBio((s) => s.orders);
  const startHarvest = useBio((s) => s.startHarvest);
  const updatePicked = useBio((s) => s.updatePicked);
  const finishHarvest = useBio((s) => s.finishHarvest);
  const reportIncident = useBio((s) => s.reportIncident);
  const { toast } = useToast();

  const [incidentFor, setIncidentFor] = React.useState<HarvestOrder | null>(null);
  const [incidentNote, setIncidentNote] = React.useState("");
  const [amountFor, setAmountFor] = React.useState<HarvestOrder | null>(null);
  const [amount, setAmount] = React.useState("");

  const active = harvestOrders
    .filter((h) => h.status !== "done")
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const done = harvestOrders.filter((h) => h.status === "done").slice(0, 4);
  const targetKg = active.reduce((s, h) => s + h.targetKg, 0);
  const pickedKg = active.reduce((s, h) => s + h.pickedKg, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Thu hoạch hôm nay"
        title="Hái đúng tiêu chuẩn khách mua"
        description="Mỗi lệnh dưới đây đã được rút gọn từ tiêu chuẩn khách mua. Cập nhật số kg đã hái để kho và bán hàng thấy ngay."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi
          label="Lệnh đang mở"
          value={hydrated ? active.length : "—"}
          sub={`${active.filter((h) => h.status === "in_progress").length} lệnh đang hái`}
          icon={Sprout}
        />
        <Kpi
          label="Mục tiêu hôm nay"
          value={hydrated ? kg(targetKg) : "—"}
          tone="leaf"
          icon={CircleDot}
        />
        <Kpi
          label="Đã hái"
          value={hydrated ? kg(pickedKg) : "—"}
          sub={targetKg > 0 ? `${Math.round((pickedKg / targetKg) * 100)}% mục tiêu` : undefined}
          tone="sun"
          icon={Timer}
        />
      </div>

      {!hydrated ? null : active.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="Không có lệnh thu hoạch nào"
          hint="Bán hàng sẽ tạo lệnh khi có đơn mới. Bạn sẽ thấy hướng dẫn hái ngay tại đây."
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
                        {order ? ` · đơn ${order.id}` : ""}
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
                        hạn chót {now ? untilText(ho.deadline, now) : "—"}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  {ho.guide.revision > 0 ? (
                    <div className="flex items-start gap-2 rounded-xl bg-sun-100 px-3.5 py-2.5 text-sm text-sun-700">
                      <RefreshCw className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Tiêu chuẩn đã được Bán hàng cập nhật (lần {ho.guide.revision}).
                        Đọc lại hướng dẫn bên dưới trước khi hái tiếp.
                      </span>
                    </div>
                  ) : null}

                  {/* Hướng dẫn hái trực quan */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-leaf-50 p-4 ring-1 ring-leaf-200">
                      <p className="text-xs font-semibold tracking-wide text-leaf-700 uppercase">
                        Hái như thế này
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
                        Tuyệt đối không
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
                        Đã hái {kg(ho.pickedKg)} / {kg(ho.targetKg)}
                      </span>
                      <span className="tnum text-sm text-muted-foreground">
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <Meter value={pct} tone={pct >= 100 ? "leaf" : "sun"} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ho.status === "pending" ? (
                      <Button
                        size="lg"
                        onClick={() => {
                          startHarvest(ho.id);
                          toast(`Đã bắt đầu lệnh ${ho.id}.`);
                        }}
                      >
                        Bắt đầu hái
                      </Button>
                    ) : null}
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => updatePicked(ho.id, ho.pickedKg + 10)}
                    >
                      <Plus /> 10 kg
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() =>
                        updatePicked(ho.id, Math.max(0, ho.pickedKg - 10))
                      }
                    >
                      <Minus /> 10 kg
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        setAmountFor(ho);
                        setAmount(String(ho.pickedKg));
                      }}
                    >
                      Nhập số kg
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        setIncidentFor(ho);
                        setIncidentNote("");
                      }}
                    >
                      <AlertTriangle /> Báo sự cố
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      disabled={ho.pickedKg <= 0}
                      onClick={() => {
                        const id = finishHarvest(ho.id);
                        toast(
                          `Đã chuyển ${kg(ho.pickedKg)} về kho — lô ${id} chờ nhận hàng.`
                        );
                      }}
                    >
                      Xong, chuyển về kho
                    </Button>
                  </div>

                  {ho.incidents.length > 0 ? (
                    <div className="rounded-xl bg-muted/50 px-3.5 py-3">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Sự cố đã báo
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
            <CardTitle>Lệnh đã xong</CardTitle>
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

      {/* Báo sự cố */}
      <Modal
        open={incidentFor !== null}
        onClose={() => setIncidentFor(null)}
        title={`Báo sự cố — ${incidentFor?.id ?? ""}`}
        description="Kho và quản lý sẽ thấy ngay ghi chú này."
        footer={
          <>
            <Button variant="outline" size="lg" onClick={() => setIncidentFor(null)}>
              Huỷ
            </Button>
            <Button
              size="lg"
              onClick={() => {
                if (!incidentFor || !incidentNote.trim()) return;
                reportIncident(incidentFor.id, incidentNote.trim());
                toast("Đã báo sự cố.", "info");
                setIncidentFor(null);
              }}
            >
              Gửi
            </Button>
          </>
        }
      >
        <Field label="Chuyện gì đang xảy ra?">
          <Textarea
            value={incidentNote}
            onChange={(e) => setIncidentNote(e.target.value)}
            placeholder="Luống cuối bị sương muối, trái nhỏ hơn tiêu chuẩn…"
          />
        </Field>
      </Modal>

      {/* Nhập số kg đã hái */}
      <Modal
        open={amountFor !== null}
        onClose={() => setAmountFor(null)}
        title={`Cập nhật sản lượng — ${amountFor?.id ?? ""}`}
        footer={
          <>
            <Button variant="outline" size="lg" onClick={() => setAmountFor(null)}>
              Huỷ
            </Button>
            <Button
              size="lg"
              onClick={() => {
                if (!amountFor) return;
                updatePicked(amountFor.id, Number(amount) || 0);
                toast("Đã cập nhật sản lượng đã hái.");
                setAmountFor(null);
              }}
            >
              Lưu
            </Button>
          </>
        }
      >
        <Field
          label="Số kg đã hái"
          hint={amountFor ? `Mục tiêu ${kg(amountFor.targetKg)}` : undefined}
        >
          <Input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 text-lg"
          />
        </Field>
      </Modal>
    </div>
  );
}
