import type {
  AdvisorVerdict,
  Batch,
  DecisionCase,
  MarketSignal,
  Order,
} from "@/types";
import { PRODUCTS } from "./catalog";
import { expectedValue, recommendedOption, riskAdjustedValue } from "./decisions";
import { hoursUntil } from "./format";
import { orderCoverage } from "./inventory";
import type { Allocation } from "@/types";

/**
 * Builds the factual packet the Decision Room assistant reasons over.
 *
 * Everything here is already computed or already entered by a person. The
 * assistant is given finished arithmetic and asked to argue about it — it is
 * never asked to produce a figure. Keeping this assembly in `lib/domain` also
 * keeps it testable and free of any UI or network concern.
 */
export function buildAdvisorRequest(input: {
  kase: DecisionCase;
  batch: Batch | undefined;
  orders: Order[];
  signals: MarketSignal[];
  batches: Batch[];
  allocations: Allocation[];
  now: number;
}) {
  const { kase, batch, orders, signals, batches, allocations, now } = input;
  const meta = batch ? PRODUCTS[batch.product] : undefined;

  return {
    batchLabel: `${kase.batchId}${meta ? ` (${meta.label})` : ""}`,
    grade: kase.grade,
    unallocatedKg: kase.unallocatedKg,
    urgency: kase.urgency,
    // Truncated, not rounded, so this agrees with the "18h overdue" the card
    // shows from `untilText` — the assistant quoting 19 against a card saying
    // 18 reads as the assistant working from different figures.
    hoursToDeadline: Math.trunc(hoursUntil(kase.actionDeadline, now)),
    origin: kase.origin,
    ruleRecommendedOptionId: recommendedOption(kase.options).id,
    options: kase.options.map((o) => ({
      id: o.id,
      label: o.label,
      detail: o.detail,
      netValue: Math.round(o.netValue),
      expectedValue: Math.round(expectedValue(o)),
      // The figure the co-op actually ranks by. Without it the assistant
      // maximises expected value, lands on a different option, and the panel
      // badges that as a second opinion — when in fact it was never shown the
      // risk and tied-up-capital discount the recommendation is built on.
      riskAdjustedValue: Math.round(riskAdjustedValue(o)),
      extraCost: Math.round(o.extraCost),
      cashInDays: o.cashInDays,
      risk: o.risk,
      certainty: o.certainty,
      basis: o.basis,
    })),
    // Only orders that could plausibly absorb this stock.
    openOrders: orders
      .filter((o) => o.status === "confirmed" || o.status === "draft")
      .filter((o) => !batch || o.product === batch.product)
      .map((o) => {
        const cov = orderCoverage(o, batches, allocations);
        return {
          id: o.id,
          buyer: o.buyerName,
          product: PRODUCTS[o.product].label,
          grade: o.spec.grade,
          qtyKg: o.qtyKg,
          stillNeededKg: cov.remainingKg,
          dueInHours: Math.round(hoursUntil(o.dueDate, now)),
        };
      }),
    liveSignals: signals
      .filter((s) => new Date(s.validUntil).getTime() > now)
      .filter((s) => !batch || s.product === batch.product)
      .map((s) => ({
        market: s.market,
        product: PRODUCTS[s.product].label,
        grade: s.grade,
        qtyKg: s.qtyKg,
        price: s.price,
        validForHours: Math.round(hoursUntil(s.validUntil, now)),
      })),
  };
}

/**
 * Calls the server route. Returns a plain message on failure — never throws.
 *
 * The client keeps its own deadline slightly longer than the route's, so a
 * route that answers late still gets to explain itself, but a route that never
 * answers at all still releases the button instead of leaving the panel stuck
 * on "Thinking…".
 */
export async function askAdvisor(
  payload: ReturnType<typeof buildAdvisorRequest>,
  signal?: AbortSignal
): Promise<{ ok: true; verdict: AdvisorVerdict } | { ok: false; message: string }> {
  const deadline = AbortSignal.timeout(25_000);
  try {
    const res = await fetch("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
    });

    // An error page (a proxy timeout, say) is not JSON — don't let that turn
    // into a thrown parse error that hides the status we did get.
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        message:
          (data as { error?: string } | null)?.error ??
          "The assistant is unavailable.",
      };
    }
    if (!data) {
      return { ok: false, message: "The assistant sent an answer we could not read." };
    }
    return { ok: true, verdict: data as AdvisorVerdict };
  } catch (error) {
    if (signal?.aborted) return { ok: false, message: "Cancelled." };
    if (deadline.aborted) {
      return { ok: false, message: "The assistant took too long to answer." };
    }
    void error;
    return { ok: false, message: "The assistant could not be reached." };
  }
}
