import {
  CRITERION_LABEL,
  DECISION_LABEL,
  GRADE_LABEL,
  PRIORITY_LABEL,
  SALES_CHANNEL_LABEL,
  type CaseOrigin,
  type CriterionKey,
  type DecisionKind,
  type DecisionPriority,
  type CoopConfig,
  type DecisionCase,
  type DecisionOption,
  type DecisionTask,
  type MarketSignal,
  type Order,
  type Urgency,
} from "@/types";
import { PRODUCTS } from "./catalog";
import { hoursUntil, kg, vnd, vndShort } from "./format";
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
    workSteps: 1,
    shelfDaysAfter: 0,
    feasibilityNote:
      "Pack and dispatch the lot as it stands — no equipment and no extra hands. Once it goes, the lot is committed.",
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
    workSteps: 2,
    shelfDaysAfter: 0,
    feasibilityNote:
      "Repack to the channel's specification and arrange transport. Routine work, but the lot is committed to that channel.",
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
    // The six protocol steps are the work, and they are recorded one by one.
    workSteps: 6,
    shelfDaysAfter: meta.actionWindowHours / 24,
    feasibilityNote: `All six protocol steps must be mixed, applied and recorded by the packhouse on the day, which buys the lot another ${meta.actionWindowHours} hours.`,
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
    detail: `Dry all ${kg(qty)} into about ${kg(driedKg)} of dried ${meta.label.toLowerCase()} at ${vnd(meta.driedPrice)}/kg. Yield is ${Math.round(
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
    workSteps: 3,
    // Dried stock is shelf-stable — this is what makes the option adaptable
    // even though it is the most work.
    shelfDaysAfter: 180,
    feasibilityNote:
      "Occupies the dryer for a full run and needs trays, fuel and packing. In return the dried lot keeps for months and can wait for a better buyer.",
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
    certaintyNote:
      "The plant takes the full volume, so the sale is near certain.",
    workSteps: 1,
    shelfDaysAfter: 0,
    feasibilityNote:
      "Consolidate the crates and hand the lot over. The plant does the rest, but the produce leaves the co-op for good.",
  });

  // 6. Hold for a better signal — only sensible when there is still plenty of time.
  const holdCost = qty * COST_PER_KG.hold;
  const holdDays = Math.max(0, hoursUntil(lot.actionDeadline, now) / 24);
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
    netValue:
      urgency === "high" ? qty * ref * 0.5 - holdCost : qty * ref - holdCost,
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
    workSteps: 0,
    // Holding buys back exactly the time left on the action deadline, no more.
    shelfDaysAfter: holdDays,
    feasibilityNote:
      "Nothing to do today beyond keeping the lot in store, but the clock keeps running on the action deadline.",
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

// ---------- The four criteria a Manager weighs an option by ----------

/**
 * A single criterion as the card renders it: the real figure, a plain tier word
 * for scanning down a column, and a 0–1 score used only for ranking. The tier
 * and the score are groupings of the figure — neither is a new business number.
 */
export interface OptionCriterion {
  key: CriterionKey;
  label: string;
  /** The audited figure, already formatted. */
  value: string;
  /** Where that figure sits: `good` / `watch` / `poor`. */
  tone: "good" | "watch" | "poor";
  /** The word shown next to the figure — reads naturally per criterion. */
  tierLabel: string;
  /** One sentence for the Explain panel. */
  note: string;
  /** 0–1, comparable across criteria, used for priority ranking only. */
  score: number;
}

/**
 * Work and shelf life behind the feasibility criterion, with a default per kind.
 *
 * Decision cases opened before these fields existed are stored in Supabase with
 * options that lack them, and those rows are never rewritten. Falling back by
 * kind keeps an old case readable instead of showing it as zero-effort.
 */
export function feasibilityProfile(option: DecisionOption): {
  workSteps: number;
  shelfDaysAfter: number;
  note: string;
} {
  const fallbackSteps: Record<DecisionKind, number> = {
    sell_now: 1,
    switch_channel: 2,
    preserve: 6,
    dry: 3,
    process: 1,
    hold: 0,
  };
  const fallbackShelf: Record<DecisionKind, number> = {
    sell_now: 0,
    switch_channel: 0,
    preserve: 1,
    dry: 180,
    process: 0,
    hold: 1,
  };
  return {
    workSteps: option.workSteps ?? fallbackSteps[option.kind],
    shelfDaysAfter: option.shelfDaysAfter ?? fallbackShelf[option.kind],
    note: option.feasibilityNote ?? option.riskNote,
  };
}

/** Options that hand the produce over there and then, rather than keeping it. */
const HANDS_OVER: Record<DecisionKind, boolean> = {
  sell_now: true,
  switch_channel: true,
  process: true,
  preserve: false,
  dry: false,
  hold: false,
};

/**
 * How long the produce can still wait once the action is done, in words.
 *
 * No waiting room left reads two different ways: an option that dispatches the
 * lot has committed it, while an option that keeps it has simply run out of
 * clock. Saying "committed now" against Hold would be plainly wrong.
 */
function shelfPhrase(days: number, kind: DecisionKind): string {
  if (days >= 30) return "keeps for months";
  if (days >= 2) return `${Math.round(days)} more days`;
  if (days >= 0.5) return "about a day more";
  return HANDS_OVER[kind] ? "committed now" : "no time left";
}

/**
 * The four criteria for one option, scored against the other options in the
 * same case. Ranking is always relative — "strong profit" only means anything
 * next to the alternatives on the table.
 */
export function optionCriteria(
  option: DecisionOption,
  options: DecisionOption[]
): Record<CriterionKey, OptionCriterion> {
  // Profit: expected value against the best expected value on the table.
  const ev = expectedValue(option);
  const bestEv = Math.max(...options.map(expectedValue), 0);
  const profitScore = bestEv > 0 ? Math.max(0, Math.min(1, ev / bestEv)) : 0;

  // Cash flow: the wait, capped at three weeks — beyond that the difference
  // stops mattering to a co-op that pays its pickers weekly.
  const cashScore = 1 - Math.min(option.cashInDays, 21) / 21;

  // Risk: the same two discounts the recommendation is built on, so the cell
  // and the ranking cannot tell the manager different stories.
  const riskFactor =
    option.risk === "high" ? 0.6 : option.risk === "medium" ? 0.85 : 1;
  const riskScore = option.certainty * riskFactor;

  // Feasibility: can the co-op actually run this with the hands and kit it has,
  // and how much room does it leave afterwards. Six recorded steps is the
  // heaviest option there is, so that is the scale.
  const { workSteps, shelfDaysAfter, note } = feasibilityProfile(option);
  const effortScore = 1 - Math.min(workSteps, 6) / 6;
  const adaptScore = Math.min(shelfDaysAfter, 30) / 30;
  const feasibilityScore = effortScore * 0.6 + adaptScore * 0.4;

  const tier = (
    score: number,
    good: string,
    watch: string,
    poor: string
  ): Pick<OptionCriterion, "tone" | "tierLabel"> =>
    score >= 0.66
      ? { tone: "good", tierLabel: good }
      : score >= 0.4
        ? { tone: "watch", tierLabel: watch }
        : { tone: "poor", tierLabel: poor };

  return {
    profit: {
      key: "profit",
      label: CRITERION_LABEL.profit,
      value: vndShort(ev),
      ...tier(profitScore, "Strong", "Fair", "Low"),
      note: `Expected ${vnd(ev)} — net ${vnd(option.netValue)} after ${vnd(
        option.extraCost
      )} of extra cost, at ${Math.round(option.certainty * 100)}% confidence.`,
      score: profitScore,
    },
    cash: {
      key: "cash",
      label: CRITERION_LABEL.cash,
      value: `${option.cashInDays} days`,
      ...tier(cashScore, "Fast", "Moderate", "Slow"),
      note: `The money is expected about ${option.cashInDays} days after the decision.`,
      score: cashScore,
    },
    risk: {
      key: "risk",
      label: CRITERION_LABEL.risk,
      value: `${Math.round(option.certainty * 100)}%`,
      tone:
        option.risk === "low"
          ? "good"
          : option.risk === "medium"
            ? "watch"
            : "poor",
      tierLabel:
        option.risk === "low"
          ? "Low risk"
          : option.risk === "medium"
            ? "Medium risk"
            : "High risk",
      note: option.riskNote,
      score: riskScore,
    },
    feasibility: {
      key: "feasibility",
      label: CRITERION_LABEL.feasibility,
      value:
        workSteps === 0
          ? `No extra work · ${shelfPhrase(shelfDaysAfter, option.kind)}`
          : `${workSteps} step${workSteps === 1 ? "" : "s"} · ${shelfPhrase(
              shelfDaysAfter,
              option.kind
            )}`,
      ...tier(feasibilityScore, "Easy", "Doable", "Demanding"),
      note,
      score: feasibilityScore,
    },
  };
}

/**
 * Weights per priority. The chosen criterion leads without silencing the other
 * three — a Manager who says "cash first" still does not want the option that
 * loses money.
 */
const PRIORITY_WEIGHT: Record<CriterionKey, Record<CriterionKey, number>> = {
  profit: { profit: 0.55, cash: 0.15, risk: 0.15, feasibility: 0.15 },
  cash: { profit: 0.15, cash: 0.55, risk: 0.15, feasibility: 0.15 },
  risk: { profit: 0.15, cash: 0.15, risk: 0.55, feasibility: 0.15 },
  feasibility: { profit: 0.15, cash: 0.15, risk: 0.15, feasibility: 0.55 },
};

/**
 * How well an option serves the Manager's stated priority, 0–1.
 *
 * `balanced` is deliberately not scored here: it is the co-op's own objective,
 * `riskAdjustedValue`, and re-expressing it as a weighted average would quietly
 * change the recommendation the rest of the app is built around.
 */
export function priorityScore(
  option: DecisionOption,
  options: DecisionOption[],
  priority: CriterionKey
): number {
  const c = optionCriteria(option, options);
  const w = PRIORITY_WEIGHT[priority];
  return (
    c.profit.score * w.profit +
    c.cash.score * w.cash +
    c.risk.score * w.risk +
    c.feasibility.score * w.feasibility
  );
}

/** The options in the order the Manager's priority ranks them, best first. */
export function rankOptions(
  options: DecisionOption[],
  priority: DecisionPriority = "balanced"
): DecisionOption[] {
  const rank =
    priority === "balanced"
      ? (o: DecisionOption) => riskAdjustedValue(o)
      : (o: DecisionOption) => priorityScore(o, options, priority);
  return [...options].sort((a, b) => rank(b) - rank(a));
}

export function recommendedOption(
  options: DecisionOption[],
  priority: DecisionPriority = "balanced"
): DecisionOption {
  return rankOptions(options, priority)[0];
}

/** A rule-based explanation — no external model is called, and every line is traceable. */
export function explainOption(
  option: DecisionOption,
  options: DecisionOption[],
  lot: Pick<Lot, "availableKg" | "grade">,
  priority: DecisionPriority = "balanced"
): string[] {
  const rec = recommendedOption(options, priority);
  const ev = expectedValue(option);
  const bestEv = Math.max(...options.map(expectedValue));
  const criteria = optionCriteria(option, options);
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
  // The four criteria the card shows, each spelled out with its own figure.
  for (const key of [
    "profit",
    "cash",
    "risk",
    "feasibility",
  ] as CriterionKey[]) {
    const c = criteria[key];
    lines.push(`${c.label} — ${c.tierLabel} (${c.value}). ${c.note}`);
  }

  if (ev < bestEv) {
    lines.push(
      `Against the option with the highest expected value (${
        options.find((o) => expectedValue(o) === bestEv)!.label
      }), this one is ${vnd(bestEv - ev)} lower.`
    );
  } else {
    lines.push("This is the option with the highest expected value.");
  }

  const under =
    priority === "balanced"
      ? "after weighing value, risk and time to cash together"
      : `under the priority now set on this case, ${PRIORITY_LABEL[
          priority
        ].toLowerCase()}`;
  if (option.id === rec.id) {
    lines.push(`The system recommends this option ${under}.`);
  } else {
    lines.push(
      `The system recommends ${rec.label} instead ${under}. Change the priority above to rank the options a different way.`
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
        base(
          `Find an order for the ${kg(lot.availableKg)} now preserved`,
          "sales"
        ),
      ];
    case "dry":
      return [
        base(
          `Load the dryer with ${kg(lot.availableKg)} from batch ${lot.batchId}`,
          "packhouse"
        ),
        base(`Weigh and pack the dried output, then label it`, "packhouse"),
        base(`Find a buyer for the dried stock`, "sales"),
      ];
    case "process":
      return [
        base(`Confirm the order with the processing plant`, "sales"),
        base(
          `Weigh, consolidate crates and hand over to the plant`,
          "packhouse"
        ),
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
