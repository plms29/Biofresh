"use client";

import * as React from "react";
import { useBio } from "@/store/use-biofresh";

const noopSubscribe = () => () => {};

/**
 * Cho biết đã gắn vào DOM chưa. Dữ liệu nằm ở localStorage nên phần phụ thuộc
 * dữ liệu chỉ được vẽ sau khi hydrate, tránh lệch giữa máy chủ và trình duyệt.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/** Đồng hồ dùng chung cho mọi phép tính "còn bao lâu", nhịp một phút. */
const clock = {
  now: 0,
  listeners: new Set<() => void>(),
  timer: undefined as number | undefined,
  subscribe(listener: () => void) {
    clock.listeners.add(listener);
    if (clock.timer === undefined) {
      clock.now = Date.now();
      clock.timer = window.setInterval(() => {
        clock.now = Date.now();
        clock.listeners.forEach((l) => l());
      }, 60_000);
    }
    return () => {
      clock.listeners.delete(listener);
      if (clock.listeners.size === 0 && clock.timer !== undefined) {
        window.clearInterval(clock.timer);
        clock.timer = undefined;
      }
    };
  },
};

/** Trả về 0 trước khi hydrate — mọi nơi dùng giá trị này đều xử lý mốc 0. */
export function useNow(): number {
  return React.useSyncExternalStore(
    clock.subscribe,
    () => clock.now,
    () => 0
  );
}

/** Nạp dữ liệu trình diễn lần đầu (chạy trên máy người dùng, không cần máy chủ). */
export function useSeed() {
  const ensureSeeded = useBio((s) => s.ensureSeeded);
  React.useEffect(() => {
    ensureSeeded();
  }, [ensureSeeded]);
}
