"use client";

import Grainient from "./Grainient";
import { useReducedMotion } from "./motion";
import { SkyClouds } from "./SkyClouds";

// Design handoff preset (React Bits Grainient), pushed to a wider blue range, a sharper blend and a
// faster drift so the movement shows. Still grain, frozen for reduced motion. Unset props use the defaults.
export function SkyBackground({ clouds = false }: { clouds?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    // The shader stretches with the canvas shape, so a short, wide strip (search, stay page) bunches
    // the blend into a hard streak. Keep it at least hero-tall and let the parent crop it.
    <div className="absolute inset-x-0 top-0 h-full min-h-[max(560px,40vw)]" aria-hidden>
      <Grainient
        color1="#CFE3F3"
        color2={clouds ? "#86AADC" : "#5583C6"}
        color3="#9AB3D9"
        timeSpeed={reduceMotion ? 0 : 0.28}
        grainAmount={0.08}
        grainScale={1.6}
        grainAnimated={false}
        blendSoftness={0.25}
        contrast={1.2}
        saturation={0.95}
      />
      {/* Dim it for dark mode. Under the clouds it deepens toward the top, like a night sky. */}
      <div
        className={`absolute inset-0 opacity-0 transition-opacity duration-(--theme-fade) ease-(--theme-ease) dark:opacity-100 ${
          clouds ? "bg-[linear-gradient(to_bottom,rgba(6,11,42,0.9),rgba(15,24,72,0.74)_55%,rgba(44,60,128,0.5))]" : "bg-[#070D2F]/60"
        }`}
      />
      {clouds && <SkyClouds />}
    </div>
  );
}
