"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "./motion";

const REACH = 20; // px from the edge where the push starts
const MAX_X = 3.5; // px of drift at full strength
const MAX_Y = 3;

/*
 * Wraps the hero search bar so it drifts away from an approaching cursor:
 * pushed opposite the cursor, strongest at the bar, fading to nothing
 * REACH px out. The push stays small enough to click into, and the bar
 * settles back while you're using it. Mouse only; off when motion is reduced.
 */
export function SearchDrift({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.style.translate = "";
      return;
    }
    let frame = 0;

    const settle = () => {
      cancelAnimationFrame(frame);
      el.style.translate = "0px 0px";
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (el.matches(":focus-within")) {
          el.style.translate = "0px 0px";
          return;
        }
        // Measure the resting box, not the drifted one, so the field doesn't chase itself.
        // (The browser shortens "Xpx 0px" to "Xpx", so y may be missing.)
        const [tx = 0, ty = 0] = el.style.translate.split(" ").map((v) => parseFloat(v) || 0);
        const r = el.getBoundingClientRect();
        const left = r.left - tx;
        const top = r.top - ty;
        const hw = r.width / 2;
        const hh = r.height / 2;
        const px = e.clientX - (left + hw);
        const py = e.clientY - (top + hh);
        const dx = Math.max(0, Math.abs(px) - hw);
        const dy = Math.max(0, Math.abs(py) - hh);
        const near = Math.max(0, 1 - Math.hypot(dx, dy) / REACH);
        const falloff = near * near * (3 - 2 * near); // smoothstep: eases in instead of kicking on
        // Opposite the cursor, scaled by where it sits across the bar plus its reach.
        // The bar is short, so the vertical push gets double weight (then capped).
        const x = (-px / (hw + REACH)) * MAX_X * falloff;
        const y = Math.max(-MAX_Y, Math.min(MAX_Y, (-py / (hh + REACH)) * MAX_Y * falloff * 2));
        el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("focusin", settle);
    document.documentElement.addEventListener("pointerleave", settle);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("focusin", settle);
      document.documentElement.removeEventListener("pointerleave", settle);
    };
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={`theme-fade-keep transition-[translate] duration-1000 ease-[cubic-bezier(0.33,1,0.68,1)] will-change-[translate] ${className}`}
    >
      {children}
    </div>
  );
}
