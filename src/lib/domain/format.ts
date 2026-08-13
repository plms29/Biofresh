/** Định dạng dùng chung — luôn dùng vi-VN để giao diện nhất quán. */

export function vnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/** Rút gọn tiền: 12,5 tr / 1,2 tỷ — dùng cho thẻ số liệu. */
export function vndShort(value: number): string {
  const v = Math.round(value);
  if (Math.abs(v) >= 1_000_000_000)
    return `${(v / 1_000_000_000).toFixed(1).replace(".", ",")} tỷ`;
  if (Math.abs(v) >= 1_000_000)
    return `${(v / 1_000_000).toFixed(1).replace(".", ",")} tr`;
  if (Math.abs(v) >= 1_000)
    return `${(v / 1_000).toFixed(0)} ng`;
  return `${v}`;
}

export function kg(value: number): string {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
    value
  )} kg`;
}

export function num(value: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
    value
  );
}

const DATE_TIME = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_ONLY = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const FULL = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function dt(iso?: string): string {
  if (!iso) return "—";
  return DATE_TIME.format(new Date(iso));
}

export function d(iso?: string): string {
  if (!iso) return "—";
  return DATE_ONLY.format(new Date(iso));
}

export function full(iso?: string): string {
  if (!iso) return "—";
  return FULL.format(new Date(iso));
}

/** "còn 5 giờ" / "quá hạn 2 giờ" — tính so với `now` truyền vào để tránh lệch SSR. */
export function untilText(iso: string, now: number): string {
  const diffMs = new Date(iso).getTime() - now;
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(hours / 24);
  const body =
    days >= 1
      ? `${days} ngày${hours % 24 ? ` ${hours % 24} giờ` : ""}`
      : hours >= 1
        ? `${hours} giờ`
        : `${Math.max(1, Math.floor(abs / 60_000))} phút`;
  return diffMs >= 0 ? `còn ${body}` : `quá hạn ${body}`;
}

export function hoursUntil(iso: string, now: number): number {
  return (new Date(iso).getTime() - now) / 3_600_000;
}
