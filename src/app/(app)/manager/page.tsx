"use client";

import * as React from "react";
import Link from "next/link";
import {
  ClipboardList,
  Coins,
  Gauge,
  PackageX,
  Settings2,
  TriangleAlert,
} from "lucide-react";
import { useBio } from "@/store/use-biofresh";
import { useHydrated, useNow } from "@/hooks/use-client-state";
import { PRODUCTS } from "@/lib/domain/catalog";
import {
  orderCoverage,
  unallocatedLots,
  valueAtRisk,
} from "@/lib/domain/inventory";
import { computeAlerts } from "@/lib/domain/alerts";
import { dt, kg, untilText, vndShort } from "@/lib/domain/format";
import { EmptyState, Kpi, PageHeader, SectionTitle } from "@/components/common/layout-bits";
import { GradeTag } from "@/components/common/badges";
import { AlertList } from "@/components/common/alert-list";
import { DecisionCaseCard } from "@/components/manager/decision-case-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Tab = "decisions" | "ops" | "config";

export default function ManagerPage() {
  const hydrated = useHydrated();
  const now = useNow();
  const state = useBio();
  const openCase = useBio((s) => s.openCase);
  const { toast } = useToast();

  const [tab, setTab] = React.useState<Tab>("decisions");

  const lots = unallocatedLots(state.batches, state.allocations);
  const surplusKg = lots.reduce((s, l) => s + l.availableKg, 0);
  const atRisk = valueAtRisk(lots);
  const coverages = state.orders
    .filter((o) => o.status === "confirmed")
    .map((o) => orderCoverage(o, state.batches, state.allocations));
  const riskyOrders = coverages.filter((c) => c.shortageKg > 0);
  const openCases = state.cases.filter((c) => !c.chosenOptionId);
  const decidedCases = state.cases.filter((c) => c.chosenOptionId);

  // Lô con chưa có ca quyết định nhưng đã vượt ngưỡng hoặc sát hạn hành động.
  const needsCase = lots.filter((l) => {
    const has = state.cases.some(
      (c) => c.batchId === l.batchId && c.grade === l.grade && !c.chosenOptionId
    );
    if (has) return false;
    const urgent =
      now > 0 &&
      new Date(l.actionDeadline).getTime() - now <
        state.config.urgentWithinHours * 3_600_000;
    return l.availableKg >= state.config.surplusThresholdKg || urgent;
  });

  const alerts = React.useMemo(
    () =>
      now === 0
        ? []
        : computeAlerts({
            orders: state.orders,
            batches: state.batches,
            allocations: state.allocations,
            harvestOrders: state.harvestOrders,
            cases: state.cases,
            config: state.config,
            now,
          }).filter((a) => a.roles.includes("manager")),
    [state, now]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Trung tâm điều hành + Phòng quyết định"
        title="Hàng dư thừa được quyết trong hôm nay, không để qua đêm"
        description="Mỗi phương án đều kèm giá trị ròng dự kiến, chi phí thêm, thời gian thu tiền và nguồn số liệu để bạn quyết nhanh mà vẫn giải thích được."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Chưa phân bổ"
          value={hydrated ? kg(surplusKg) : "—"}
          sub={`${lots.length} lô con`}
          tone="sun"
          icon={PackageX}
        />
        <Kpi
          label="Tiền đang có nguy cơ"
          value={hydrated ? vndShort(atRisk) : "—"}
          sub="Giá tham chiếu nội bộ"
          tone="risk"
          icon={Coins}
        />
        <Kpi
          label="Đơn đang rủi ro"
          value={hydrated ? riskyOrders.length : "—"}
          sub={`thiếu ${kg(riskyOrders.reduce((s, c) => s + c.shortageKg, 0))}`}
          icon={TriangleAlert}
        />
        <Kpi
          label="Ca chờ quyết định"
          value={hydrated ? openCases.length + needsCase.length : "—"}
          sub={`${decidedCases.length} ca đã chốt`}
          tone="leaf"
          icon={ClipboardList}
        />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          {
            value: "decisions",
            label: "Phòng quyết định",
            badge: openCases.length + needsCase.length,
          },
          { value: "ops", label: "Điều hành", badge: alerts.length },
          { value: "config", label: "Cấu hình" },
        ]}
      />

      {tab === "decisions" ? (
        <div className="flex flex-col gap-4">
          {hydrated && needsCase.length > 0 ? (
            <Card>
              <CardHeader className="border-b">
                <SectionTitle
                  title="Cần mở ca quyết định"
                  hint={`Vượt ngưỡng ${kg(
                    state.config.surplusThresholdKg
                  )} hoặc sát hạn hành động.`}
                />
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {needsCase.map((l) => {
                    const urgent =
                      now > 0 &&
                      new Date(l.actionDeadline).getTime() - now <
                        state.config.urgentWithinHours * 3_600_000;
                    return (
                      <li
                        key={`${l.batchId}-${l.grade}`}
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-3 rounded-xl px-3.5 py-3 ring-1",
                          urgent
                            ? "bg-risk-100/60 ring-risk-300/60"
                            : "bg-sun-100/50 ring-sun-300/60"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            <Link
                              href={`/batches/${l.batchId}`}
                              className="hover:underline"
                            >
                              {l.batchId}
                            </Link>
                            <GradeTag grade={l.grade} />
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {PRODUCTS[l.product].emoji} {PRODUCTS[l.product].label} ·{" "}
                            {l.origin} · {kg(l.availableKg)} chưa phân bổ ·{" "}
                            {now ? untilText(l.actionDeadline, now) : "—"}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            openCase(l.batchId, l.grade);
                            toast(
                              `Đã mở ca quyết định cho ${l.batchId} · ${l.grade}.`
                            );
                          }}
                        >
                          Mở ca quyết định
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {!hydrated ? null : openCases.length === 0 && needsCase.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Không có hàng dư thừa cần quyết"
              hint="Mọi khối lượng đã kiểm soát chất lượng đều đã có đầu ra."
            />
          ) : null}

          {openCases.map((c) => (
            <DecisionCaseCard key={c.id} kase={c} now={now} />
          ))}

          {decidedCases.length > 0 ? (
            <>
              <SectionTitle
                title="Ca đã quyết định"
                hint="Theo dõi việc cần làm của từng bộ phận."
              />
              {decidedCases.map((c) => (
                <DecisionCaseCard key={c.id} kase={c} now={now} />
              ))}
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "ops" ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader className="border-b">
              <CardTitle>Cảnh báo cần bạn xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              {hydrated ? <AlertList alerts={alerts} /> : null}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Đơn đã chốt và độ phủ hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {coverages.map((c) => (
                    <li key={c.order.id} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {c.order.buyerName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {c.order.id} · hạn {dt(c.order.dueDate)}
                        </span>
                      </span>
                      <span className="tnum shrink-0 text-right">
                        <span className="block">
                          {kg(c.allocatedKg)} / {kg(c.order.qtyKg)}
                        </span>
                        <span
                          className={
                            c.shortageKg > 0
                              ? "text-xs font-medium text-risk-700"
                              : "text-xs text-leaf-700"
                          }
                        >
                          {c.shortageKg > 0
                            ? `thiếu ${kg(c.shortageKg)}`
                            : "đủ hàng"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Nhật ký vận hành</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {(hydrated ? state.activity.slice(0, 12) : []).map((a) => (
                    <li key={a.id} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-leaf-400" />
                      <div className="min-w-0">
                        <p className="text-sm">{a.text}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {a.actor} · {dt(a.at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "config" ? (
        <ConfigPanel
          key={`${state.config.surplusThresholdKg}-${state.config.urgentWithinHours}`}
        />
      ) : null}
    </div>
  );
}

/**
 * Ngưỡng cấu hình của HTX. Gắn lại theo key mỗi khi cấu hình đổi để ô nhập
 * luôn khởi tạo từ giá trị đang lưu.
 */
function ConfigPanel() {
  const config = useBio((s) => s.config);
  const setConfig = useBio((s) => s.setConfig);
  const { toast } = useToast();
  const [threshold, setThreshold] = React.useState(
    String(config.surplusThresholdKg)
  );
  const [urgentHours, setUrgentHours] = React.useState(
    String(config.urgentWithinHours)
  );

  return (
    <Card>
      <CardHeader className="border-b">
        <SectionTitle
          icon={Settings2}
          title="Cấu hình HTX"
          hint="Phiên bản đầu dùng ngưỡng do người vận hành đặt, không dùng mô hình dự báo thời gian tươi còn lại."
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Ngưỡng hàng dư thừa (kg)"
            hint="Khối lượng chưa phân bổ vượt mức này sẽ vào Phòng quyết định."
          >
            <Input
              type="number"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </Field>
          <Field
            label="Coi là khẩn cấp khi còn dưới (giờ)"
            hint="So với hạn phải hành động của từng lô con."
          >
            <Input
              type="number"
              inputMode="numeric"
              value={urgentHours}
              onChange={(e) => setUrgentHours(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setConfig({
                surplusThresholdKg: Math.max(1, Number(threshold) || 1),
                urgentWithinHours: Math.max(1, Number(urgentHours) || 1),
              });
              toast("Đã lưu cấu hình — cảnh báo sẽ tính lại theo ngưỡng mới.");
            }}
          >
            Lưu cấu hình
          </Button>
        </div>

        <div className="rounded-xl bg-muted/50 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Gauge className="size-4 text-leaf-600" /> Cửa sổ hành động theo sản
            phẩm
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {Object.values(PRODUCTS).map((p) => (
              <li key={p.key} className="tnum flex justify-between gap-2">
                <span>
                  {p.emoji} {p.label}
                </span>
                <span className="text-muted-foreground">
                  {p.actionWindowHours} giờ sau kiểm soát chất lượng
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
