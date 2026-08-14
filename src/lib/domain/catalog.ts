import type { ProductKey, ProductMeta } from "@/types";

/**
 * Product catalogue with the internal reference price recorded by the co-op
 * and the action window (configured by hand — this release does not use a
 * remaining-freshness forecasting model).
 *
 * Each product carries a two-letter code and a colour tone instead of an
 * emoji, so the mark renders identically on every platform and can be
 * contrast-checked and themed.
 *
 * `sizeBands` are what a picker judges at the bush. Strawberry and mango are
 * specified by buyers in millimetres, so those bands carry mm ranges and the
 * picking screen can flag which band the order actually wants; the rest are
 * sorted by weight in the trade, so their cue is grams and no mm matching is
 * attempted.
 */
export const PRODUCTS: Record<ProductKey, ProductMeta> = {
  strawberry: {
    key: "strawberry",
    label: "Strawberry",
    code: "SB",
    tone: "crimson",
    unit: "kg",
    actionWindowHours: 24,
    refPrice: { A: 165000, B: 105000, PROCESS: 45000, REJECT: 6000 },
    sizeBands: [
      { key: "L", hint: "35 mm and up", minMm: 35 },
      { key: "M", hint: "28 – 34 mm", minMm: 28, maxMm: 34 },
      { key: "S", hint: "under 28 mm", maxMm: 27 },
    ],
    dryYield: 0.10,
    driedPrice: 620000,
  },
  dragon_fruit: {
    key: "dragon_fruit",
    label: "Dragon fruit",
    code: "DF",
    tone: "magenta",
    unit: "kg",
    actionWindowHours: 72,
    refPrice: { A: 32000, B: 19000, PROCESS: 8000, REJECT: 1500 },
    sizeBands: [
      { key: "L", hint: "over 500 g" },
      { key: "M", hint: "350 – 500 g" },
      { key: "S", hint: "under 350 g" },
    ],
    dryYield: 0.12,
    driedPrice: 210000,
  },
  mango: {
    key: "mango",
    label: "Mango",
    code: "MG",
    tone: "amber",
    unit: "kg",
    actionWindowHours: 60,
    refPrice: { A: 45000, B: 28000, PROCESS: 11000, REJECT: 2000 },
    sizeBands: [
      { key: "L", hint: "90 mm and up", minMm: 90 },
      { key: "M", hint: "75 – 89 mm", minMm: 75, maxMm: 89 },
      { key: "S", hint: "under 75 mm", maxMm: 74 },
    ],
    dryYield: 0.13,
    driedPrice: 260000,
  },
  avocado: {
    key: "avocado",
    label: "Avocado",
    code: "AV",
    tone: "olive",
    unit: "kg",
    actionWindowHours: 96,
    refPrice: { A: 58000, B: 36000, PROCESS: 14000, REJECT: 2500 },
    sizeBands: [
      { key: "L", hint: "over 300 g" },
      { key: "M", hint: "200 – 300 g" },
      { key: "S", hint: "under 200 g" },
    ],
    dryYield: 0.18,
    driedPrice: 180000,
  },
  passion_fruit: {
    key: "passion_fruit",
    label: "Passion fruit",
    code: "PF",
    tone: "violet",
    unit: "kg",
    actionWindowHours: 84,
    refPrice: { A: 38000, B: 24000, PROCESS: 12000, REJECT: 2000 },
    sizeBands: [
      { key: "L", hint: "over 100 g" },
      { key: "M", hint: "70 – 100 g" },
      { key: "S", hint: "under 70 g" },
    ],
    dryYield: 0.11,
    driedPrice: 240000,
  },
};

export const PRODUCT_KEYS = Object.keys(PRODUCTS) as ProductKey[];

export function product(key: ProductKey): ProductMeta {
  return PRODUCTS[key];
}
