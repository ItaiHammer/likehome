import { SkyBackground } from "./SkyBackground";

// Needs a full-width `relative isolate` parent. 192px so slate text from ~160px down (the stay page's
// location line) sits where the sky has faded enough to read; small text above that should be ink.
export function PageBackdrop({ className = "h-48" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_35%,transparent)] ${className}`}>
      <SkyBackground />
    </div>
  );
}
