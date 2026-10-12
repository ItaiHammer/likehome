"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotion } from "./motion";
import ShinyText from "./ShinyText";

// Shiny Text can't read CSS variables, so these mirror --blue per theme. The sheen is pale blue, not
// white, so the words stay visible on the white card as it passes.
const COLORS = {
  light: { base: "#4473b5", shine: "#9ab8e4" },
  dark: { base: "#6e95d6", shine: "#d3e0f5" },
};

const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};
const getTheme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

// Plain var(--blue) until hydrated, when the theme is known, so the first frame is right in both themes
export function ShinyLabel({ text }: { text: string }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => null);
  const reduced = useReducedMotion();
  const colors = theme ? COLORS[theme] : null;

  return (
    <ShinyText
      text={text}
      color={colors?.base ?? "var(--blue)"}
      shineColor={colors?.shine ?? "var(--blue)"}
      speed={3}
      delay={2.5}
      disabled={!colors || reduced}
      // Windows high contrast drops the gradient the text is painted with, so give the letters a real color
      className="forced-colors:[-webkit-text-fill-color:CanvasText]"
    />
  );
}
