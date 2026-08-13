"use client";

import * as React from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/** Mã QR duy nhất của lô — trỏ tới Hộ chiếu Quy trình ở chế độ chỉ xem. */
export function QrCode({
  value,
  size = 176,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#144734", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc(null);
      });
    return () => {
      alive = false;
    };
  }, [value, size]);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl bg-white p-2 ring-1 ring-foreground/10",
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // Ảnh QR sinh tại trình duyệt dưới dạng data URL
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Mã QR ${value}`} className="size-full" />
      ) : (
        <span className="text-xs text-muted-foreground">Đang tạo mã…</span>
      )}
    </div>
  );
}
