"use client";

import Grainient from "./Grainient";
import { useReducedMotion } from "./motion";

// Design handoff preset (React Bits Grainient): slow gradient movement, still
// grain, frozen for reduced motion. Everything not set here is a component default.
export function SkyBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0" aria-hidden>
      <Grainient
        color1="#B9D4E8"
        color2="#739CD2"
        color3="#A4B9D8"
        timeSpeed={reduceMotion ? 0 : 0.12}
        grainAmount={0.08}
        grainScale={1.6}
        grainAnimated={false}
        blendSoftness={0.6}
        contrast={1}
        saturation={0.85}
      />
      {/* Dim it for dark mode */}
      <div className="absolute inset-0 bg-[#070D2F]/60 opacity-0 dark:opacity-100" />
    </div>
  );
}
