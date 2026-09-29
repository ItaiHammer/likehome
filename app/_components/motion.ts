"use client";

import { useSyncExternalStore } from "react";

// Motion preference lives on <html data-motion="reduce|full">. The inline script
// in layout.tsx sets it before first paint (saved choice, else the OS setting);
// MotionToggle flips it. CSS reads it through the `motion-reduce:` variant and
// `[data-motion="reduce"]` rules in globals.css; JS reads it with this hook.

const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => mo.disconnect();
};

export const isMotionReduced = () => document.documentElement.dataset.motion === "reduce";

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, isMotionReduced, () => false);
}

export function setMotionReduced(reduce: boolean) {
  const value = reduce ? "reduce" : "full";
  document.documentElement.dataset.motion = value;
  try {
    localStorage.setItem("motion", value);
  } catch {}
}
