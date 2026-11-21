// Clouds for the homepage sky, drifting left to right (globals.css: .sky-cloud). Each is an
// off-screen ellipse whose blurred shadow is roughed up by the turbulence filter; only the wrapper
// moves, so the browser draws each cloud once.
const CLOUDS = [
  { top: -120, scale: 1.1, seconds: 220, start: 0.12, opacity: 1, rest: "-6vw" },
  { top: 30, scale: 0.6, seconds: 150, start: 0.38, opacity: 0.85, rest: "22vw" },
  { top: -90, scale: 0.8, seconds: 190, start: 0.58, opacity: 0.9, rest: "46vw" },
  { top: -60, scale: 1.2, seconds: 240, start: 0.86, opacity: 1, rest: "70vw" },
  { top: 170, scale: 0.5, seconds: 130, start: 0.72, opacity: 0.7, rest: "60vw" },
  { top: 200, scale: 0.75, seconds: 170, start: 0.03, opacity: 0.75, rest: "4vw" },
];

// Night only. A seeded generator, so the scatter is uneven like a real sky but the server and the
// browser still draw the same one. Mostly faint pinpricks, a few brighter; thinner toward the horizon.
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = seeded(20261119);
const STARS = Array.from({ length: 70 }, () => {
  const bright = random() < 0.12;
  return {
    left: +(random() * 100).toFixed(2),
    top: +(random() ** 1.7 * 64).toFixed(2),
    size: +(bright ? 2 + random() * 0.8 : 0.8 + random() * 0.9).toFixed(2),
    opacity: +(bright ? 0.85 + random() * 0.15 : 0.3 + random() * 0.45).toFixed(2),
    glow: bright,
    seconds: +(3 + random() * 6).toFixed(2),
    delay: +(-random() * 9).toFixed(2),
    // Some hold steady: a sky where every star pulses looks mechanical
    still: random() < 0.35,
  };
});

export function SkyClouds() {
  return (
    <div className="sky-clouds absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 opacity-0 transition-opacity duration-(--theme-fade) ease-(--theme-ease) dark:opacity-100">
        {/* Moonlight from the upper right */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_14%,rgba(176,196,255,0.3),transparent_42%)]" />
        {STARS.map((s, i) => (
          <span
            key={i}
            className={`sky-star ${s.glow ? "sky-star-bright" : ""}`}
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDuration: `${s.seconds}s`,
              animationDelay: `${s.delay}s`,
              animationName: s.still ? "none" : undefined,
            }}
          />
        ))}
      </div>
      <svg width="0" height="0" className="absolute">
        <filter id="sky-cloud-body">
          <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="4" seed="8" />
          <feDisplacementMap in="SourceGraphic" scale="140" />
        </filter>
        <filter id="sky-cloud-shade">
          <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="3" seed="8" />
          <feDisplacementMap in="SourceGraphic" scale="140" />
        </filter>
      </svg>
      {/* Thinned at night so the stars show through. Opacity, because that's what a theme switch fades. */}
      <div className="absolute inset-0 transition-opacity duration-(--theme-fade) ease-(--theme-ease) dark:opacity-30">
        {CLOUDS.map((c, i) => (
          <div
            key={i}
            className="sky-cloud"
            style={{
              top: c.top,
              scale: c.scale,
              opacity: c.opacity,
              "--drift": `${c.seconds}s`,
              "--delay": `${-c.seconds * c.start}s`,
              "--rest": c.rest,
            } as React.CSSProperties}
          >
            <div className="sky-cloud-shade" />
            <div className="sky-cloud-body" />
          </div>
        ))}
      </div>
    </div>
  );
}
