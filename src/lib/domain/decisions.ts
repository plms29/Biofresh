import {
  DECISION_LABEL,
  GRADE_LABEL,
  SALES_CHANNEL_LABEL,
  type CaseOrigin,
  type CoopConfig,
  type DecisionCase,
  type DecisionOption,
  type DecisionTask,
  type MarketSignal,
  type Order,
  type Urgency,
} from "@/types";
import { PRODUCTS } from "./catalog";
import { hoursUntil, kg, vnd } from "./format";
import type { Lot } from "./inventory";

/** Estimated extra cost (VND/kg) — internal configuration, visible to the Manager. */
const COST_PER_KG = {
  transportSpot: 1200,
  transportChannel: 2000,
  preserve: 3500, // solution + labour + drying + repacking
  dry: 9000, // fuel, trays, labour and packing — charged per kg of *fresh* input
  process: 2500, // haulage to the processing plant
  hold: 300, // ambient storage
};

/** Price factor per sales channel when switching channel (relative to the internal reference price). */
const CHANNEL_FACTOR = {
  wholesale: 0.78,
  retail: 0.95,
  supermarket: 1.0,
  export: 1.15,
  processing: 0.45,
} as const;

function urgencyOf(lot: Lot, config: CoopConfig, now: number): Urgency {
  const h = hoursUntil(lot.actionDeadline, now);
  if (h <= 0) return "high";
  if (h <= config.urgentWithinHours) return "high";
  if (h <= config.urgentWithinHours * 2) return "medium";
  return "low";
}

function activeSignals(
  signals: MarketSignal[],
  lot: Lot,
  now: number
): MarketSignal[] {
  return signals
    .filter(
      (s) =>
        s.product === lot.product &&
        s.grade === lot.grade &&
        new Date(s.validUntil).getTime() > now
    )
    .sort((a, b) => b.price - a.price);
}

/**
 * Builds the surplus-handling options for a single sub-lot.
 * Every figure comes from open orders, market signals entered by Sales, and the
 * internal reference price. There is no forecasting model — each number is traceable.
 */
export function buildOptions(
  lot: Lot,
  orders: Order[],
  signals: MarketSignal[],
  config: CoopConfig,
  now: number
): DecisionOption[] {
  const meta = PRODUCTS[lot.product];
  const ref = meta.refPrice[lot.grade];
  const qty = lot.availableKg;
  const urgency = urgencyOf(lot, config, now);
  const options: DecisionOption[] = [];

  // 1. Sell now — prefer a market signal that is still valid, otherwise sell at a discount to the reference price.
  const best = activeSignals(signals, lot, now)[0];
  const spotQty = best ? Math.min(qty, best.qtyKg) : qty;
  const spotPrice = best ? best.price : Math.round(ref * 0.88);
  const spotCost = spotQty * COST_PER_KG.transportSpot;
  options.push({
    id: "sell_now",
    kind: "sell_now",
    label: DECISION_LABEL.sell_now,
    detail: best
      ? `Sell ${kg(spotQty)} to ${best.market} on the market signal of ${vnd(
          best.price
        )}/kg (valid until ${new Date(best.validUntil).toLocaleDateString(
          "en-GB"
        )}).`
      : `No market signal is currently valid. Clear the lot quickly at the internal reference price less 12%: ${vnd(
          spotPrice
        )}/kg.`,
    netValue: spotQty * spotPrice - spotCost,
    extraCost: spotCost,
    cashInDays: best ? 3 : 2,
    risk: best ? "low" : "medium",
    riskNote: best
      ? "A named buyer is already in place, so the risk is low."
      : "No named buyer yet; a further price cut may be needed.",
    basis: best
      ? `Market signal ${best.id} (${best.enteredBy})`
      : "Internal reference price − 12%",
    requiresProtocol: false,
    certainty: best ? 0.95 : 0.75,
    certaintyNote: best
      ? `A buyer has already asked for this produce (${best.market}).`
      : "No buyer has asked yet; the lot must be offered around again.",
  });

  // 2. Switch channel — reuse the channel of another open order, or fall back to the wholesale market.
  const otherChannels = [
    ...new Set(
      orders
        .filter((o) => o.product === lot.product && o.status !== "cancelled")
        .map((o) => o.salesChannel)
    ),
  ];
  const channel =
    otherChannels.find((c) => c !== "supermarket") ?? ("wholesale" as const);
  const chPrice = Math.round(ref * CHANNEL_FACTOR[channel]);
  const chCost = qty * COST_PER_KG.transportChannel;
  options.push({
    id: "switch_channel",
    kind: "switch_channel",
    label: `${DECISION_LABEL.switch_channel} → ${SALES_CHANNEL_LABEL[channel]}`,
    detail: `Move all ${kg(qty)} to the ${
      SALES_CHANNEL_LABEL[channel]
    } channel at an estimated ${vnd(chPrice)}/kg (${Math.round(
      CHANNEL_FACTOR[channel] * 100
    )}% of the reference price). No extra handling required.`,
    netValue: qty * chPrice - chCost,
    extraCost: chCost,
    cashInDays: 5,
    risk: "low",
    riskNote:
      "The channel takes large volumes at a lower standard, so rejections are rare.",
    basis: `Reference price x ${SALES_CHANNEL_LABEL[channel]} channel factor`,
    requiresProtocol: false,
    certainty: 0.85,
    certaintyNote:
      "A familiar channel that takes volume, but the price still has to be agreed.",
  });

  // 3. Preserve under the BioFresh Field Protocol — hold the grade and sell later at a better price.
  const preserveCost = qty * COST_PER_KG.preserve;
  const preserveKeep = 0.94; // 6% physical loss during re-handling
  options.push({
    id: "preserve",
    kind: "preserve",
    label: DECISION_LABEL.preserve,
    detail: `Run the preservation treatment to hold ${
      GRADE_LABEL[lot.grade]
    } for a further ${
      meta.actionWindowHours
    } hours while a better-priced order is found. About ${kg(
      qty * preserveKeep
    )} is expected to remain after losses, sold at ${vnd(
      ref
    )}/kg. All six protocol steps must be recorded.`,
    netValue: qty * preserveKeep * ref - preserveCost,
    extraCost: preserveCost,
    cashInDays: 8,
    risk: urgency === "high" ? "high" : "medium",
    riskNote:
      urgency === "high"
        ? "The lot is already close to its action deadline; the treatment may not finish in time."
        : "Needs labour and enough solution on the day, and depends on a future order.",
    basis: "Internal reference price − preservation cost",
    requiresProtocol: true,
    certainty: urgency === "high" ? 0.55 : 0.7,
    certaintyNote:
      "The grade is preserved, but an order still has to be found afterwards.",
  });

  // 4. Drying — turns a perishable problem into a shelf-stable product. The
  //    yield is brutal (roughly 10 kg fresh to 1 kg dried) but the dried price
  //    is high enough that it can still beat wholesale, and the deadline stops
  //    mattering once the fruit is dry.
  const driedKg = qty * meta.dryYield;
  const dryCost = qty * COST_PER_KG.dry;
  options.push({
    id: "dry",
    kind: "dry",
    label: DECISION_LABEL.dry,
    detail: `Dry all ${kg(qty)} into about ${kg(driedKg)} of dried ${
      meta.label.toLowerCase()
    } at ${vnd(meta.driedPrice)}/kg. Yield is ${Math.round(
      meta.dryYield * 100
    )}%, but the result keeps for months, so the action deadline stops applying.`,
    netValue: driedKg * meta.driedPrice - dryCost,
    extraCost: dryCost,
    cashInDays: 20,
    risk: "medium",
    riskNote:
      "Ties up the dryer and the cash for weeks, and dried stock still has to be sold.",
    basis: "Dried yield and dried price from the internal catalogue",
    requiresProtocol: false,
    certainty: 0.8,
    certaintyNote:
      "The process itself is reliable; finding a buyer for dried stock is the open part.",
  });

  // 5. Processing — guaranteed offtake at a low price.
  const procPrice = meta.refPrice.PROCESS;
  const procCost = qty * COST_PER_KG.process;
  options.push({
    id: "process",
    kind: "process",
    label: DECISION_LABEL.process,
    detail: `Sell all ${kg(qty)} to the processing plant at ${vnd(
      procPrice
    )}/kg. The whole lot is taken, with no spoilage risk.`,
    netValue: qty * procPrice - procCost,
    extraCost: procCost,
    cashInDays: 12,
    risk: "low",
    riskNote:
      "The lowest price, but almost no risk of being left with unsold stock.",
    basis: "Processing-grade price from the internal catalogue",
    requiresProtocol: false,
    certainty: 0.98,
    certaintyNote: "The plant takes the full volume, so the sale is near certain.",
  });

  // 6. Hold for a better signal — only sensible when there is still plenty of time.
  const holdCost = qty * COST_PER_KG.hold;
  options.push({
    id: "hold",
    kind: "hold",
    label: DECISION_LABEL.hold,
    detail:
      urgency === "high"
        ? `Not recommended: the lot has under ${config.urgentWithinHours} hours left before its action deadline.`
        : `Keep the lot in store and wait for Sales to enter a market signal above ${vnd(
            ref
          )}/kg. Review again before the action deadline.`,
    netValue: urgency === "high" ? qty * ref * 0.5 - holdCost : qty * ref - holdCost,
    extraCost: holdCost,
    cashInDays: 10,
    risk: urgency === "high" ? "high" : "medium",
    riskNote:
      urgency === "high"
        ? "Very high risk of losing value unless the lot is acted on today."
        : "No buyer yet, so the figure remains an expectation.",
    basis: "Internal reference price, with no confirmed buyer",
    requiresProtocol: false,
    certainty: urgency === "high" ? 0.25 : 0.5,
    certaintyNote:
      urgency === "high"
        ? "Nobody has asked for the lot and its deadline is close, so selling at this price is unlikely."
        : "Nobody has asked for the lot; the figure holds only if a good signal appears.",
  });

  return options;
}

/**
 * Expected value = net value x confidence.
 * Without a buyer in place, even an attractive figure is only an expectation.
 */
export function expectedValue(option: DecisionOption): number {
  return option.netValue * option.certainty;
}

/**
 * The option the system recommends: the highest expected value, discounted for
 * risk and for tied-up capital (1% per day of expected value).
 */
export function riskAdjustedValue(option: DecisionOption): number {
  const riskFactor =
    option.risk === "high" ? 0.6 : option.risk === "medium" ? 0.85 : 1;
  return (
    expectedValue(option) *
    riskFactor *
    (1 - Math.min(0.3, option.cashInDays * 0.01))
  );
}

export function recommendedOption(options: DecisionOption[]): DecisionOption {
  return [...options].sort(
    (a, b) => riskAdjustedValue(b) - riskAdjustedValue(a)
  )[0];
}

/** A rule-based explanation — no external model is called, and every line is traceable. */
export function explainOption(
  option: DecisionOption,
  options: DecisionOption[],
  lot: Pick<Lot, "availableKg" | "grade">
): string[] {
  const rec = recommendedOption(options);
  const ev = expectedValue(option);
  const bestEv = Math.max(...options.map(expectedValue));
  const lines: string[] = [];

  lines.push(
    `${option.label}: expected net value ${vnd(option.netValue)} for ${kg(
      lot.availableKg
    )} ${GRADE_LABEL[lot.grade]}, after extra cost of ${vnd(option.extraCost)}.`
  );
  lines.push(
    `Confidence ${Math.round(
      option.certainty * 100
    )}% — ${option.certaintyNote} That leaves an expected value of ${vnd(ev)}.`
  );
  lines.push(
    `Data source: ${option.basis}. Cash expected in about ${option.cashInDays} days.`
  );
  lines.push(`Risk: ${option.riskNote}`);

  if (ev < bestEv) {
    lines.push(
      `Against the option with the highest expected value (${
        options.find((o) => expectedValue(o) === bestEv)!.label
      }), this one is ${vnd(bestEv - ev)} lower.`
    );
  } else {
    lines.push("This is the option with the highest expected value.");
  }

  if (option.id === rec.id) {
    lines.push(
      "The system recommends this option after weighing value, risk and time to cash."
    );
  } else {
    lines.push(
      `The system recommends ${rec.label} instead, as a better balance of net value, risk and time to cash.`
    );
  }

  if (option.requiresProtocol) {
    lines.push(
      "All six steps of the BioFresh Field Protocol must be recorded before processing can be marked complete."
    );
  }
  return lines;
}

/** The tasks created once the Manager has committed to an option. */
export function tasksForOption(
  option: DecisionOption,
  lot: Pick<Lot, "batchId" | "availableKg">
): DecisionTask[] {
  const base = (label: string, owner: DecisionTask["owner"]): DecisionTask => ({
    id: `${option.id}-${owner}-${label.slice(0, 12)}`,
    label,
    owner,
    done: false,
  });

  switch (option.kind) {
    case "sell_now":
      return [
        base(
          `Confirm buyer and price for ${kg(lot.availableKg)} from batch ${lot.batchId}`,
          "sales"
        ),
        base(`Pack and dispatch ${kg(lot.availableKg)} today`, "packhouse"),
      ];
    case "switch_channel":
      return [
        base(`Contact the new channel and confirm volume and price`, "sales"),
        base(`Pack to the new channel's specification`, "packhouse"),
      ];
    case "preserve":
      return [
        base(
          `Mix the solution and record all six protocol steps for batch ${lot.batchId}`,
          "packhouse"
        ),
        base(`Find an order for the ${kg(lot.availableKg)} now preserved`, "sales"),
      ];
    case "dry":
      return [
        base(`Load the dryer with ${kg(lot.availableKg)} from batch ${lot.batchId}`, "packhouse"),
        base(`Weigh and pack the dried output, then label it`, "packhouse"),
        base(`Find a buyer for the dried stock`, "sales"),
      ];
    case "process":
      return [
        base(`Confirm the order with the processing plant`, "sales"),
        base(`Weigh, consolidate crates and hand over to the plant`, "packhouse"),
      ];
    case "hold":
      return [
        base(`Enter a fresh market signal before the action deadline`, "sales"),
        base(`Re-check the lot's quality before the deadline`, "packhouse"),
      ];
  }
}

/** Opens a decision case for a sub-lot that has passed the co-op's configured surplus threshold. */
export function buildDecisionCase(
  lot: Lot,
  orders: Order[],
  signals: MarketSignal[],
  config: CoopConfig,
  now: number,
  origin: CaseOrigin = "surplus"
): DecisionCase {
  return {
    id: `DC-${lot.batchId}-${lot.grade}`,
    batchId: lot.batchId,
    grade: lot.grade,
    unallocatedKg: lot.availableKg,
    urgency: urgencyOf(lot, config, now),
    actionDeadline: lot.actionDeadline,
    options: buildOptions(lot, orders, signals, config, now),
    tasks: [],
    createdAt: new Date(now).toISOString(),
    origin,
  };
}

export { urgencyOf };
