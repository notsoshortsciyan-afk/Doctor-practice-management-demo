import { useCallback, useEffect, useState } from "react";

/** Printed-prescription main-content text scale, persisted per browser. */
export type RxScale = "s" | "m" | "l";

const KEY = "rx-fs";
const DEFAULT: RxScale = "m";

function isScale(v: string | null): v is RxScale {
  return v === "s" || v === "m" || v === "l";
}

export function getRxScale(): RxScale {
  try {
    const v = localStorage.getItem(KEY);
    return isScale(v) ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setRxScale(scale: RxScale) {
  try {
    localStorage.setItem(KEY, scale);
  } catch {
    /* ignore (private mode / disabled storage) */
  }
  // Notify same-tab listeners (the native `storage` event only fires cross-tab).
  window.dispatchEvent(new CustomEvent("rx-scale-change", { detail: scale }));
}

/**
 * Read/write the persisted Rx text scale. All mount points stay in sync because
 * `setRxScale` broadcasts a `rx-scale-change` event that every hook listens for.
 */
export function useRxScale(): [RxScale, (s: RxScale) => void] {
  const [scale, setLocal] = useState<RxScale>(getRxScale);

  useEffect(() => {
    const sync = () => setLocal(getRxScale());
    window.addEventListener("rx-scale-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("rx-scale-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const set = useCallback((s: RxScale) => setRxScale(s), []);
  return [scale, set];
}

export const RX_SCALE_OPTIONS: { key: RxScale; label: string }[] = [
  { key: "s", label: "S" },
  { key: "m", label: "M" },
  { key: "l", label: "L" },
];
