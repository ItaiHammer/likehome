"use client";

import Grainient from "./Grainient";
import { useReducedMotion } from "./motion";

// Design handoff preset (React Bits Grainient), pushed to a wider blue range, a sharper blend and a
// faster drift so the movement shows. Still grain, frozen for reduced motion. Unset props use the defaults.
export function SkyBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0" aria-hidden>
      <Grainient
        color1="#CFE3F3"
        color2="#5583C6"
        color3="#9AB3D9"
        timeSpeed={reduceMotion ? 0 : 0.28}
        grainAmount={0.08}
        grainScale={1.6}
        grainAnimated={false}
        blendSoftness={0.25}
        contrast={1.2}
        saturation={0.95}
      />
      {/* Dim it for dark mode */}
      <div className="absolute inset-0 bg-[#070D2F]/60 opacity-0 dark:opacity-100" />
    </div>
  );
}
