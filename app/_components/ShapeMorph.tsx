"use client";

import { useEffect, useRef } from "react";

/*
 * Mosaic scenes built from small geometric shapes that fly apart and rebuild
 * the next scene: hotel (squares) → house (triangles) → cabin (diamonds) →
 * villa (circles) → hotel …
 * Every piece is a particle. On each morph they leave in a left-to-right wave,
 * arc through the air spinning, turn into the next scene's shape and land —
 * each on a sine ease (slow → fast → slow).
 */

const COLS = 36;
const ROWS = 30;
const CELL = 8;
const W = COLS * CELL;
const H = ROWS * CELL;

const HOLD = 1800; // ms resting on a scene
const MORPH = 2300; // ms for the whole wave to pass
const FLIGHT = 0.55; // share of MORPH a single piece spends in the air
const SPREAD = 0.35; // share of MORPH over which departures are staggered (left → right)

// ---- shapes ------------------------------------------------------------------
// Every shape is 16 points clockwise from the top, so they can turn into each
// other point-by-point while keeping straight edges.

type Pt = [number, number];

// Insert the midpoint between each pair of points (8 → 16)
const subdivide = (pts: Pt[]): Pt[] =>
  pts.flatMap((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return [p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as Pt];
  });
const scale = (pts: Pt[], s: number): Pt[] => pts.map(([x, y]) => [x * s, y * s]);

const SQUARE = scale(subdivide([[0, -0.5], [0.5, -0.5], [0.5, 0], [0.5, 0.5], [0, 0.5], [-0.5, 0.5], [-0.5, 0], [-0.5, -0.5]]), 0.84);
const TRIANGLE = scale(subdivide([[0, -0.5], [1 / 6, -1 / 6], [1 / 3, 1 / 6], [0.5, 0.5], [0, 0.5], [-0.5, 0.5], [-1 / 3, 1 / 6], [-1 / 6, -1 / 6]]), 1.02);
const DIAMOND = scale(subdivide([[0, -0.5], [0.25, -0.25], [0.5, 0], [0.25, 0.25], [0, 0.5], [-0.25, 0.25], [-0.5, 0], [-0.25, -0.25]]), 1.08);
const CIRCLE = Array.from({ length: 16 }, (_, i) => {
  const a = -Math.PI / 2 + (i / 16) * Math.PI * 2;
  return [Math.cos(a) * 0.46, Math.sin(a) * 0.46] as Pt;
});

// ---- scenes ------------------------------------------------------------------

type Cell = { x: number; y: number; color: string };
type Scene = { label: string; sky: [string, string]; shape: Pt[]; cells: Cell[] };
type Paint = (x: number, y: number, w: number, h: number, color: string) => void;

function scene(label: string, sky: [string, string], shape: Pt[], draw: (rect: Paint) => void): Scene {
  const grid = new Map<number, string>();
  draw((x, y, w, h, color) => {
    for (let i = x; i < x + w; i++)
      for (let j = y; j < y + h; j++)
        if (i >= 0 && i < COLS && j >= 0 && j < ROWS) grid.set(j * COLS + i, color);
  });
  const cells = [...grid].map(([k, color]) => ({ x: k % COLS, y: Math.floor(k / COLS), color }));
  // Bottom rows first, so ground pieces tend to land on ground pieces
  cells.sort((a, b) => b.y - a.y || a.x - b.x);
  return { label, sky, shape, cells };
}

// Rows of a symmetric triangle centred on columns 17–18
function triangle(rect: Paint, top: number, bottom: number, slope: number, inset: number, color: (y: number) => string) {
  for (let y = top; y <= bottom; y++) {
    const d = Math.floor((y - top) * slope) - inset;
    if (d >= 0) rect(17 - d, y, 2 + 2 * d, 1, color(y));
  }
}

const SCENES: Scene[] = [
  scene("A hotel room…", ["#141f45", "#4a5f9e"], SQUARE, (r) => {
    for (const [x, y] of [[9, 4], [27, 2], [31, 7], [34, 1], [7, 10], [30, 12], [2, 13], [34, 16], [20, 0]]) r(x, y, 1, 1, "#ffffff");
    r(3, 2, 3, 4, "#fdf3c4");
    r(2, 3, 5, 2, "#fdf3c4");
    r(12, 0, 12, 2, "#e2574c");
    for (let x = 13; x < 23; x += 2) r(x, 0, 1, 1, "#f6d27a");
    r(10, 3, 16, 1, "#8fa3c6");
    r(11, 4, 14, 23, "#c9d6ea");
    r(24, 4, 1, 23, "#aebfdb");
    for (const y of [5, 8, 11, 14, 17, 20])
      for (const x of [12, 15, 18, 21]) r(x, y, 2, 2, (x + y) % 3 === 0 ? "#5d86c8" : "#f6d27a");
    r(14, 22, 8, 1, "#1a2a5c");
    r(15, 23, 6, 4, "#5d86c8");
    r(17, 23, 1, 4, "#c9d6ea");
    r(8, 25, 2, 2, "#5c8a45");
    r(26, 25, 2, 2, "#5c8a45");
    r(1, 27, 34, 1, "#7fae62");
    r(0, 28, 36, 2, "#6c9a4f");
  }),

  scene("…becomes a cozy house…", ["#6fa3df", "#d4e7fa"], TRIANGLE, (r) => {
    r(28, 2, 4, 4, "#fde7a8");
    r(27, 3, 6, 2, "#fde7a8");
    r(4, 4, 6, 1, "#ffffff");
    r(5, 3, 3, 1, "#ffffff");
    r(13, 2, 5, 1, "#ffffff");
    r(14, 1, 2, 1, "#ffffff");
    r(22, 8, 2, 5, "#b9643d");
    triangle(r, 7, 13, 1, 0, (y) => (y % 2 ? "#d9824f" : "#cf7543"));
    r(8, 14, 20, 1, "#b9643d");
    r(10, 15, 16, 12, "#f6e7d2");
    r(25, 15, 1, 12, "#e8d3b3");
    r(12, 17, 3, 3, "#a6cbf2");
    r(21, 17, 3, 3, "#a6cbf2");
    r(12, 20, 3, 1, "#8d5b31");
    r(21, 20, 3, 1, "#8d5b31");
    r(12, 20, 1, 1, "#e46a6a");
    r(14, 20, 1, 1, "#f2b84b");
    r(21, 20, 1, 1, "#f2b84b");
    r(23, 20, 1, 1, "#e46a6a");
    r(16, 21, 4, 6, "#3f67c9");
    r(16, 21, 1, 1, "#f6e7d2");
    r(19, 21, 1, 1, "#f6e7d2");
    r(18, 24, 1, 1, "#f6d27a");
    r(2, 24, 6, 1, "#fbf5ec");
    for (const x of [2, 4, 6]) r(x, 23, 1, 4, "#fbf5ec");
    r(30, 22, 1, 5, "#8d5b31");
    r(28, 16, 5, 6, "#5c8a45");
    r(27, 17, 7, 4, "#5c8a45");
    r(29, 17, 2, 2, "#6b9a50");
    r(1, 27, 34, 1, "#7fae62");
    r(0, 28, 36, 2, "#6c9a4f");
    r(16, 27, 4, 1, "#e8d3b3");
  }),

  scene("…a mountain cabin…", ["#4b5aa8", "#c4b5e6"], DIAMOND, (r) => {
    for (const [x, y] of [[2, 3], [8, 1], [12, 6], [26, 2], [31, 5], [34, 9], [5, 10], [23, 4], [1, 16], [33, 18], [10, 12]]) r(x, y, 1, 1, "#ffffff");
    triangle(r, 5, 26, 0.62, 0, () => "#5a3a22");
    for (let y = 5; y <= 14; y++) {
      const d = Math.floor((y - 5) * 0.62);
      r(17 - d, y, 1, 1, "#ffffff");
      r(18 + d, y, 1, 1, "#ffffff");
    }
    triangle(r, 5, 26, 0.62, 2, (y) => (y % 2 ? "#a4703f" : "#8d5b31"));
    triangle(r, 5, 21, 0.62, 4, () => "#f6d27a");
    r(13, 18, 10, 1, "#8d5b31");
    r(16, 22, 4, 5, "#5a3a22");
    for (const [cx, top] of [[4, 13], [31, 11]]) {
      for (let y = top; y <= 24; y++) {
        const d = Math.floor((y - top) * 0.4);
        r(cx - d, y, 1 + 2 * d, 1, y === top ? "#ffffff" : "#2f5a3c");
      }
      r(cx, 25, 1, 2, "#5a3a22");
    }
    r(1, 27, 34, 1, "#eef3f8");
    r(0, 28, 36, 2, "#dfe8f2");
  }),

  scene("…or a beach villa.", ["#f08a5d", "#fbe0b4"], CIRCLE, (r) => {
    r(4, 8, 4, 4, "#fbd38a");
    r(3, 9, 6, 2, "#fbd38a");
    for (const [x, y] of [[12, 4], [13, 5], [14, 4], [19, 2], [20, 3], [21, 2]]) r(x, y, 1, 1, "#6b4a3a");
    r(11, 9, 14, 1, "#cf7543");
    r(12, 10, 12, 5, "#fbf7f0");
    r(15, 11, 6, 2, "#4d92d8");
    r(6, 15, 24, 1, "#cf7543");
    r(7, 16, 22, 11, "#fbf7f0");
    r(28, 16, 1, 11, "#eee4d4");
    r(16, 20, 4, 7, "#3f67c9");
    r(16, 20, 1, 1, "#fbf7f0");
    r(19, 20, 1, 1, "#fbf7f0");
    r(9, 19, 3, 3, "#4d92d8");
    r(24, 19, 3, 3, "#4d92d8");
    r(7, 16, 2, 3, "#d9559a");
    r(8, 19, 1, 2, "#d9559a");
    for (let y = 12; y <= 26; y++) r(y < 18 ? 32 : 31, y, 1, 1, "#a4703f");
    r(30, 9, 5, 1, "#5c9a4f");
    r(29, 10, 7, 1, "#4f8a45");
    r(28, 11, 2, 1, "#4f8a45");
    r(34, 11, 2, 1, "#4f8a45");
    r(27, 12, 2, 1, "#4f8a45");
    r(35, 12, 1, 1, "#4f8a45");
    r(1, 27, 34, 1, "#f1dfb0");
    r(0, 28, 36, 1, "#e8cf98");
    r(0, 29, 36, 1, "#4d92d8");
  }),
];

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
const easeSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// One particle per cell of the biggest scene; smaller scenes stack a few particles per cell
const COUNT = Math.max(...SCENES.map((s) => s.cells.length));
const TARGETS = SCENES.map((s) =>
  Array.from({ length: COUNT }, (_, i) => {
    const c = s.cells[Math.floor((i * s.cells.length) / COUNT)];
    return { x: c.x * CELL + CELL / 2, y: c.y * CELL + CELL / 2, col: c.x, rgb: hex(c.color) };
  })
);
const SKIES = SCENES.map((s) => s.sky.map(hex));

export function ShapeMorph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const caption = captionRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fixed per-piece randomness: sideways swirl, arc height, spin direction, departure jitter
    const seeds = Array.from({ length: COUNT }, () => [Math.random(), Math.random(), Math.random()]);

    function drawPiece(x: number, y: number, from: Pt[], to: Pt[], e: number, size: number, rot: number) {
      const cos = Math.cos(rot) * size;
      const sin = Math.sin(rot) * size;
      ctx.beginPath();
      for (let k = 0; k < 16; k++) {
        const px = from[k][0] + (to[k][0] - from[k][0]) * e;
        const py = from[k][1] + (to[k][1] - from[k][1]) * e;
        const sx = x + px * cos - py * sin;
        const sy = y + px * sin + py * cos;
        if (k === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    }

    function draw(from: number, to: number, m: number) {
      const skyT = easeSine(m);
      const [a0, a1] = SKIES[from];
      const [b0, b1] = SKIES[to];
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, mix(a0, b0, skyT));
      sky.addColorStop(1, mix(a1, b1, skyT));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      const A = TARGETS[from];
      const B = TARGETS[to];
      const shapeA = SCENES[from].shape;
      const shapeB = SCENES[to].shape;
      for (let i = 0; i < COUNT; i++) {
        const a = A[i];
        const b = B[i];
        const [s1, s2, s3] = seeds[i];
        const delay = (a.col / COLS) * SPREAD + s3 * 0.1;
        const e = easeSine(clamp01((m - delay) / FLIGHT));

        let x = a.x;
        let y = a.y;
        let size = CELL;
        let rot = 0;
        if (e >= 1) {
          x = b.x;
          y = b.y;
        } else if (e > 0) {
          // Quadratic Bézier: lift up and swirl sideways mid-flight, spinning one full turn
          const cx = (a.x + b.x) / 2 + (s1 - 0.5) * 90;
          const cy = Math.min(a.y, b.y) - 30 - s2 * 70;
          const u = 1 - e;
          x = u * u * a.x + 2 * u * e * cx + e * e * b.x;
          y = u * u * a.y + 2 * u * e * cy + e * e * b.y;
          size = CELL * (1 + 0.25 * Math.sin(Math.PI * e));
          rot = e * Math.PI * 2 * (s1 > 0.5 ? 1 : -1);
        }

        ctx.fillStyle = mix(a.rgb, b.rgb, e);
        drawPiece(x, y, shapeA, shapeB, e, size, rot);
      }
    }

    function setCaption(text: string, opacity: number) {
      if (caption.textContent !== text) caption.textContent = text;
      caption.style.opacity = String(opacity);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw(1, 1, 0);
      setCaption(SCENES[1].label, 1);
      return;
    }

    let frame = 0;
    let running = false;
    let start = 0;
    let pausedAt = 0;

    const tick = (now: number) => {
      // rAF timestamps can be a hair earlier than the performance.now() we started from
      const t = Math.max(0, now - start);
      const phase = HOLD + MORPH;
      const from = Math.floor(t / phase) % SCENES.length;
      const to = (from + 1) % SCENES.length;
      const local = t % phase;
      const m = local < HOLD ? 0 : (local - HOLD) / MORPH;
      draw(from, to, m);
      setCaption(SCENES[m < 0.5 ? from : to].label, local < HOLD ? 1 : clamp01(Math.abs(m - 0.5) * 4 - 0.4));
      frame = requestAnimationFrame(tick);
    };

    // Only animate while the canvas is on screen
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        start = performance.now() - pausedAt;
        frame = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting && running) {
        running = false;
        pausedAt = performance.now() - start;
        cancelAnimationFrame(frame);
      }
    });
    draw(0, 1, 0);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="block h-auto w-full"
        role="img"
        aria-label="Animation: a hotel made of squares breaks apart and rebuilds as a house of triangles, a cabin of diamonds and a villa of circles"
      />
      <span
        ref={captionRef}
        aria-hidden
        className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-3 py-1 text-sm font-semibold text-ink shadow-sm backdrop-blur"
      >
        {SCENES[0].label}
      </span>
    </div>
  );
}
