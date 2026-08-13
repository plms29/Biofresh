import {
  GRADE_LABEL,
  type Alert,
  type Allocation,
  type Batch,
  type CoopConfig,
  type DecisionCase,
  type HarvestOrder,
  type Order,
} from "@/types";
import { PRODUCTS } from "./catalog";
import { hoursUntil, kg, untilText } from "./format";
import { isProtocolComplete } from "./protocol";
import { orderCoverage, unallocatedLots } from "./inventory";

export interface AlertInput {
  orders: Order[];
  batches: Batch[];
  allocations: Allocation[];
  harvestOrders: HarvestOrder[];
  cases: DecisionCase[];
  config: CoopConfig;
  now: number;
}

/**
 * Bộ quy tắc cảnh báo của phiên bản đầu (mục 6 của hướng dẫn kỹ thuật).
 * Tất cả đều là quy tắc tường minh, không dùng mô hình dự báo.
 */
export function computeAlerts(input: AlertInput): Alert[] {
  const { orders, batches, allocations, harvestOrders, cases, config, now } =
    input;
  const alerts: Alert[] = [];

  // 1. Thiếu hàng cho đơn đã chốt.
  for (const order of orders.filter((o) => o.status === "confirmed")) {
    const cov = orderCoverage(order, batches, allocations);
    if (cov.shortageKg > 0) {
      alerts.push({
        id: `shortage-${order.id}`,
        kind: "order_shortage",
        severity: hoursUntil(order.dueDate, now) < 48 ? "high" : "medium",
        title: `Thiếu hàng: ${order.buyerName} (${order.id})`,
        detail: `Còn thiếu ${kg(cov.shortageKg)} ${
          GRADE_LABEL[order.spec.grade]
        } ${PRODUCTS[order.product].label}. Hạn giao ${untilText(
          order.dueDate,
          now
        )}.`,
        roles: ["sales", "manager", "field"],
        href: "/sales",
      });
    }
    if (cov.overAllocatedKg > 0) {
      alerts.push({
        id: `over-${order.id}`,
        kind: "order_shortage",
        severity: "medium",
        title: `Phân bổ vượt số lượng: ${order.id}`,
        detail: `Đã phân bổ ${kg(cov.allocatedKg)} cho đơn ${kg(
          order.qtyKg
        )} — vượt ${kg(cov.overAllocatedKg)}.`,
        roles: ["sales", "manager"],
        href: "/sales",
      });
    }
  }

  // 2. Hàng dư thừa vượt ngưỡng cấu hình.
  const lots = unallocatedLots(batches, allocations);
  for (const lot of lots) {
    const decided = cases.find(
      (c) => c.batchId === lot.batchId && c.grade === lot.grade && c.chosenOptionId
    );
    if (decided) continue;
    if (lot.availableKg >= config.surplusThresholdKg) {
      alerts.push({
        id: `surplus-${lot.batchId}-${lot.grade}`,
        kind: "surplus",
        severity: "medium",
        title: `Hàng dư thừa: ${lot.batchId} · ${GRADE_LABEL[lot.grade]}`,
        detail: `${kg(lot.availableKg)} đã kiểm soát chất lượng nhưng chưa phân bổ (ngưỡng ${kg(
          config.surplusThresholdKg
        )}).`,
        roles: ["manager", "sales"],
        href: "/manager",
      });
    }

    // 3. Lô có rủi ro: sắp tới hạn phải hành động.
    const h = hoursUntil(lot.actionDeadline, now);
    if (h <= config.urgentWithinHours) {
      alerts.push({
        id: `risk-${lot.batchId}-${lot.grade}`,
        kind: "batch_at_risk",
        severity: "high",
        title: `Lô có rủi ro: ${lot.batchId} · ${GRADE_LABEL[lot.grade]}`,
        detail: `${kg(lot.availableKg)} chưa phân bổ, hạn phải hành động ${untilText(
          lot.actionDeadline,
          now
        )}.`,
        roles: ["manager", "sales", "packhouse"],
        href: "/manager",
      });
    }
  }

  // 4. Tiêu chuẩn khách mua đã cập nhật -> hướng dẫn ngoài vườn phải đọc lại.
  for (const ho of harvestOrders.filter((h) => h.status !== "done")) {
    if (ho.guide.revision > 0) {
      const order = orders.find((o) => o.id === ho.orderId);
      alerts.push({
        id: `spec-${ho.id}-${ho.guide.revision}`,
        kind: "spec_updated",
        severity: "medium",
        title: `Tiêu chuẩn đã cập nhật: lệnh ${ho.id}`,
        detail: `Hướng dẫn hái đã được cập nhật lần ${ho.guide.revision}${
          order ? ` theo tiêu chuẩn mới của ${order.buyerName}` : ""
        }. Ngoài vườn cần đọc lại trước khi hái.`,
        roles: ["field", "manager"],
        href: "/field",
      });
    }
  }

  // 5. Quy trình chưa hoàn tất trong khi lô đang ở bước xử lý.
  for (const batch of batches.filter((b) => b.status === "processing")) {
    if (!isProtocolComplete(batch)) {
      const done = batch.protocol.filter((s) => s.status === "done").length;
      alerts.push({
        id: `protocol-${batch.id}`,
        kind: "protocol_incomplete",
        severity: "medium",
        title: `Quy trình chưa hoàn tất: ${batch.id}`,
        detail: `Đã ghi ${done}/6 bước Quy trình Thực địa BioFresh. Chưa thể đánh dấu hoàn tất xử lý.`,
        roles: ["packhouse", "manager"],
        href: `/batches/${batch.id}`,
      });
    }
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export function alertsForRole(alerts: Alert[], role: Alert["roles"][number]) {
  return alerts.filter((a) => a.roles.includes(role));
}
