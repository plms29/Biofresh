import type { ProductKey, ProductTone } from "@/types";
import { PRODUCTS } from "@/lib/domain/catalog";
import { cn } from "@/lib/utils";

/**
 * Products are identified by a coloured two-letter mark instead of an emoji.
 * Emoji render differently on every platform, cannot be themed, and cannot be
 * contrast-checked — a coloured token can do all three.
 */
const TONE: Record<ProductTone, string> = {
  crimson: "bg-rose-100 text-rose-800 ring-rose-200",
  magenta: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200",
  amber: "bg-amber-100 text-amber-900 ring-amber-200",
  olive: "bg-lime-100 text-lime-900 ring-lime-200",
  violet: "bg-violet-100 text-violet-800 ring-violet-200",
};

const SIZE = {
  sm: "size-5 text-[10px]",
  md: "size-7 text-xs",
  lg: "size-9 text-sm",
} as const;

export function ProductMark({
  product,
  size = "sm",
  className,
}: {
  product: ProductKey;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const meta = PRODUCTS[product];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-heading font-semibold ring-1 ring-inset",
        TONE[meta.tone],
        SIZE[size],
        className
      )}
    >
      {meta.code}
    </span>
  );
}

/** Coloured mark followed by the product name — the standard way to name a product. */
export function ProductLabel({
  product,
  size = "sm",
  className,
}: {
  product: ProductKey;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <ProductMark product={product} size={size} />
      {PRODUCTS[product].label}
    </span>
  );
}
