import type { ProductKey, ProductMeta } from "@/types";

/**
 * Product catalogue with the internal reference price recorded by the co-op
 * and the action window (configured by hand — this release does not use a
 * remaining-freshness forecasting model).
 *
 * Each product carries a two-letter code and a colour tone instead of an
 * emoji, so the mark renders identically on every platform and can be
 * contrast-checked and themed.
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
  },
  dragon_fruit: {
    key: "dragon_fruit",
    label: "Dragon fruit",
    code: "DF",
    tone: "magenta",
    unit: "kg",
    actionWindowHours: 72,
    refPrice: { A: 32000, B: 19000, PROCESS: 8000, REJECT: 1500 },
  },
  mango: {
    key: "mango",
    label: "Mango",
    code: "MG",
    tone: "amber",
    unit: "kg",
    actionWindowHours: 60,
    refPrice: { A: 45000, B: 28000, PROCESS: 11000, REJECT: 2000 },
  },
  avocado: {
    key: "avocado",
    label: "Avocado",
    code: "AV",
    tone: "olive",
    unit: "kg",
    actionWindowHours: 96,
    refPrice: { A: 58000, B: 36000, PROCESS: 14000, REJECT: 2500 },
  },
  passion_fruit: {
    key: "passion_fruit",
    label: "Passion fruit",
    code: "PF",
    tone: "violet",
    unit: "kg",
    actionWindowHours: 84,
    refPrice: { A: 38000, B: 24000, PROCESS: 12000, REJECT: 2000 },
  },
};

export const PRODUCT_KEYS = Object.keys(PRODUCTS) as ProductKey[];

export function product(key: ProductKey): ProductMeta {
  return PRODUCTS[key];
}
