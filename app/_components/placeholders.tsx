"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "./motion";

// Search bar placeholder copy. Each field starts on a random option per page
// load, then rolls through the rest. Every option starts with a different
// word, across both lists.
const LISTS = {
  where: ["Anywhere you like", "Somewhere new", "Where to?", "Your next favorite spot"],
  when: ["Whenever works", "Pick a few nights", "When’s good?", "Flexible dates"],
};
type Kind = keyof typeof LISTS;

const EVERY = 3200; // ms each phrase stays up
// Dates roll a beat after destinations, so the two don't move in lockstep.
const OFFSET: Record<Kind, number> = { where: 0, when: 700 };

let picks: Record<Kind, number> | null = null;
const getPicks = () =>
  (picks ??= {
    where: Math.floor(Math.random() * LISTS.where.length),
    when: Math.floor(Math.random() * LISTS.when.length),
  });
const noSubscribe = () => () => {};

/*
 * Placeholder text that rolls like a ticker: the current phrase slides up and
 * out while the next slides up into place. The server (and hydration) show
 * the first option; the browser then swaps in this load's random start
 * without animating. Holds still while `paused` (e.g. the field is focused)
 * or when motion is reduced.
 */
export function RotatingPlaceholder({ kind, paused = false, className = "" }: { kind: Kind; paused?: boolean; className?: string }) {
  const list = LISTS[kind];
  const start = useSyncExternalStore(noSubscribe, () => getPicks()[kind], () => 0);
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (paused || reduced) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      setStep((s) => s + 1);
      interval = setInterval(() => setStep((s) => s + 1), EVERY);
    }, EVERY + OFFSET[kind]);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [paused, reduced, kind]);

  const current = list[(start + step) % list.length];
  const previous = step > 0 ? list[(start + step - 1) % list.length] : null;

  return (
    <span aria-hidden className={`relative block h-6 overflow-hidden ${className}`}>
      {previous !== null && (
        <span key={`out-${step}`} className="ph-out absolute inset-0 truncate">
          {previous}
        </span>
      )}
      <span key={`in-${step}`} className={`block truncate ${step > 0 ? "ph-in" : ""}`}>
        {current}
      </span>
    </span>
  );
}
