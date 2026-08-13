import type { ProductKey, ProductMeta } from "@/types";

/**
 * Danh mục sản phẩm với giá tham chiếu nội bộ do HTX ghi nhận và
 * cửa sổ thời gian phải hành động (cấu hình tay — phiên bản đầu không dùng
 * mô hình dự báo thời gian tươi còn lại).
 */
export const PRODUCTS: Record<ProductKey, ProductMeta> = {
  strawberry: {
    key: "strawberry",
    label: "Dâu tây",
    emoji: "🍓",
    unit: "kg",
    actionWindowHours: 24,
    refPrice: { A: 165000, B: 105000, PROCESS: 45000, REJECT: 6000 },
  },
  dragon_fruit: {
    key: "dragon_fruit",
    label: "Thanh long",
    emoji: "🐉",
    unit: "kg",
    actionWindowHours: 72,
    refPrice: { A: 32000, B: 19000, PROCESS: 8000, REJECT: 1500 },
  },
  mango: {
    key: "mango",
    label: "Xoài",
    emoji: "🥭",
    unit: "kg",
    actionWindowHours: 60,
    refPrice: { A: 45000, B: 28000, PROCESS: 11000, REJECT: 2000 },
  },
  avocado: {
    key: "avocado",
    label: "Bơ",
    emoji: "🥑",
    unit: "kg",
    actionWindowHours: 96,
    refPrice: { A: 58000, B: 36000, PROCESS: 14000, REJECT: 2500 },
  },
  passion_fruit: {
    key: "passion_fruit",
    label: "Chanh dây",
    emoji: "💜",
    unit: "kg",
    actionWindowHours: 84,
    refPrice: { A: 38000, B: 24000, PROCESS: 12000, REJECT: 2000 },
  },
};

export const PRODUCT_KEYS = Object.keys(PRODUCTS) as ProductKey[];

export function product(key: ProductKey): ProductMeta {
  return PRODUCTS[key];
}

export function productLabel(key: ProductKey): string {
  return `${PRODUCTS[key].emoji} ${PRODUCTS[key].label}`;
}
