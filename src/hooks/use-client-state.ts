"use client";

import * as React from "react";
import { useBio } from "@/store/use-biofresh";

const noopSubscribe = () => () => {};

/**
 * Reports whether the component has mounted. State lives in localStorage, so
 * anything that depends on it renders only after hydration — that keeps the
 * server and browser output identical.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/** One shared clock for every "time remaining" calculation, ticking once a minute. */
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

/** Returns 0 before hydration — every caller handles the 0 case explicitly. */
export function useNow(): number {
  return React.useSyncExternalStore(
    clock.subscribe,
    () => clock.now,
    () => 0
  );
}

/** Loads the demo dataset on first run (client-side only — no server needed). */
export function useSeed() {
  const ensureSeeded = useBio((s) => s.ensureSeeded);
  React.useEffect(() => {
    ensureSeeded();
  }, [ensureSeeded]);
}
