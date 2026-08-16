import {
  PRIORITY_LABEL,
  type AdvisorVerdict,
  type Batch,
  type DecisionCase,
  type DecisionPriority,
  type MarketSignal,
  type Order,
} from "@/types";
import { PRODUCTS } from "./catalog";
import {
  expectedValue,
  feasibilityProfile,
  optionCriteria,
  priorityScore,
  recommendedOption,
  riskAdjustedValue,
} from "./decisions";
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
  priority: DecisionPriority;
  now: number;
}) {
  const { kase, batch, orders, signals, batches, allocations, priority, now } =
    input;
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
    // The Manager can re-rank the options by one of the four criteria. Sending
    // the objective the screen is actually ranking by — and the per-criterion
    // scores behind it — is the same rule as `riskAdjustedValue`: an assistant
    // shown a different objective disagrees for no real reason.
    managerPriority: PRIORITY_LABEL[priority],
    rankingBasis:
      priority === "balanced"
        ? "riskAdjustedValue — the co-op's own balance of value, risk and time to cash"
        : `a weighted score of the four criteria, with ${PRIORITY_LABEL[
            priority
          ].toLowerCase()} carrying most of the weight`,
    ruleRecommendedOptionId: recommendedOption(kase.options, priority).id,
    options: kase.options.map((o) => {
      const criteria = optionCriteria(o, kase.options);
      const feasibility = feasibilityProfile(o);
      return {
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
        // The four criteria exactly as the Manager sees them on the card.
        criteria: {
          profit: criteria.profit.tierLabel,
          cashFlow: criteria.cash.tierLabel,
          risk: criteria.risk.tierLabel,
          feasibility: criteria.feasibility.tierLabel,
        },
        workSteps: feasibility.workSteps,
        staysSellableForDays: Math.round(feasibility.shelfDaysAfter),
        feasibilityNote: feasibility.note,
        // Out of 100, and only when a priority is set: under Balanced the
        // ranking figure is riskAdjustedValue, which is already above. Sending
        // the actual ranking number, not just the four tier words, is what
        // stops the assistant from ordering the options its own way.
        rankingScore:
          priority === "balanced"
            ? null
            : Math.round(priorityScore(o, kase.options, priority) * 100),
      };
    }),
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
): Promise<
  { ok: true; verdict: AdvisorVerdict } | { ok: false; message: string }
> {
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
      return {
        ok: false,
        message: "The assistant sent an answer we could not read.",
      };
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
