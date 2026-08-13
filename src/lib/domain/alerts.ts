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
 * The alert rule set for the first release (section 6 of the technical guide).
 * Every rule is explicit — no forecasting model is involved.
 */
export function computeAlerts(input: AlertInput): Alert[] {
  const { orders, batches, allocations, harvestOrders, cases, config, now } =
    input;
  const alerts: Alert[] = [];

  // 1. Shortage against a confirmed order.
  for (const order of orders.filter((o) => o.status === "confirmed")) {
    const cov = orderCoverage(order, batches, allocations);
    if (cov.shortageKg > 0) {
      alerts.push({
        id: `shortage-${order.id}`,
        kind: "order_shortage",
        severity: hoursUntil(order.dueDate, now) < 48 ? "high" : "medium",
        title: `Shortage: ${order.buyerName} (${order.id})`,
        detail: `Short by ${kg(cov.shortageKg)} ${
          GRADE_LABEL[order.spec.grade]
        } ${PRODUCTS[order.product].label}. Delivery deadline: ${untilText(
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
        title: `Over-allocated: ${order.id}`,
        detail: `${kg(cov.allocatedKg)} allocated against an order of ${kg(
          order.qtyKg
        )} — ${kg(cov.overAllocatedKg)} too much.`,
        roles: ["sales", "manager"],
        href: "/sales",
      });
    }
  }

  // 2. Surplus above the configured threshold.
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
        title: `Surplus: ${lot.batchId} · ${GRADE_LABEL[lot.grade]}`,
        detail: `${kg(lot.availableKg)} graded but still unallocated (threshold ${kg(
          config.surplusThresholdKg
        )}).`,
        roles: ["manager", "sales"],
        href: "/manager",
      });
    }

    // 3. Batch at risk: the action deadline is close.
    const h = hoursUntil(lot.actionDeadline, now);
    if (h <= config.urgentWithinHours) {
      alerts.push({
        id: `risk-${lot.batchId}-${lot.grade}`,
        kind: "batch_at_risk",
        severity: "high",
        title: `Batch at risk: ${lot.batchId} · ${GRADE_LABEL[lot.grade]}`,
        detail: `${kg(lot.availableKg)} unallocated. Action deadline: ${untilText(
          lot.actionDeadline,
          now
        )}.`,
        roles: ["manager", "sales", "packhouse"],
        href: "/manager",
      });
    }
  }

  // 4. Buyer specification updated -> the field must re-read the picking guide.
  for (const ho of harvestOrders.filter((h) => h.status !== "done")) {
    if (ho.guide.revision > 0) {
      const order = orders.find((o) => o.id === ho.orderId);
      alerts.push({
        id: `spec-${ho.id}-${ho.guide.revision}`,
        kind: "spec_updated",
        severity: "medium",
        title: `Specification updated: harvest order ${ho.id}`,
        detail: `The picking guide has been revised ${ho.guide.revision} time(s)${
          order ? ` to match the new specification from ${order.buyerName}` : ""
        }. The field team must re-read it before picking.`,
        roles: ["field", "manager"],
        href: "/field",
      });
    }
  }

  // 5. Protocol incomplete while the batch is already being processed.
  for (const batch of batches.filter((b) => b.status === "processing")) {
    if (!isProtocolComplete(batch)) {
      const done = batch.protocol.filter((s) => s.status === "done").length;
      alerts.push({
        id: `protocol-${batch.id}`,
        kind: "protocol_incomplete",
        severity: "medium",
        title: `Protocol incomplete: ${batch.id}`,
        detail: `${done}/6 steps of the BioFresh Field Protocol recorded. Processing cannot be marked complete yet.`,
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
