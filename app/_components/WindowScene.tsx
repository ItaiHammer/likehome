export type SceneVariant = "sea" | "mountain" | "desert" | "city";

const palettes: Record<
  SceneVariant,
  { wall: string; reveal: string; skyTop: string; skyBottom: string; nightTop: string; nightBottom: string }
> = {
  sea: { wall: "#f3e8d8", reveal: "#e6d4bb", skyTop: "#4a86d6", skyBottom: "#cfe3f7", nightTop: "#27306b", nightBottom: "#6a6fb3" },
  mountain: { wall: "#e9dccb", reveal: "#d7c3a7", skyTop: "#6fa3df", skyBottom: "#e3eef9", nightTop: "#2a2f66", nightBottom: "#7477b8" },
  desert: { wall: "#f4e2cf", reveal: "#e5c9aa", skyTop: "#f19a6a", skyBottom: "#fbe0b4", nightTop: "#2e2a63", nightBottom: "#8a6fa8" },
  city: { wall: "#efe4e0", reveal: "#dccbc4", skyTop: "#8ea8de", skyBottom: "#f6c9ae", nightTop: "#2b2d68", nightBottom: "#8573ad" },
};

// Lit windows at night: [x, y, width, height] in scene units, drawn over the dimmed view.
const NIGHT_LIGHTS: Record<SceneVariant, [number, number, number, number][]> = {
  sea: [[202, 166, 8, 6]],
  mountain: [[159, 176, 6, 10]],
  desert: [],
  city: [[104, 140, 4, 6], [124, 128, 4, 6], [142, 146, 4, 6], [164, 120, 4, 6], [180, 136, 4, 6], [202, 144, 4, 6]],
};

const STARS: [number, number][] = [[112, 58], [136, 42], [168, 36], [118, 92], [214, 88], [150, 70]];

// The arched opening, and everything outside it (for dimming the room at night).
const ARCH = "M95 202 V95 A65 65 0 0 1 225 95 V202 Z";
const ROOM = `M0 0 H320 V240 H0 Z ${ARCH}`;

function View({ variant }: { variant: SceneVariant }) {
  switch (variant) {
    case "sea":
      return (
        <>
          <g fill="#fff" opacity="0.9">
            <ellipse cx="130" cy="72" rx="18" ry="6" />
            <ellipse cx="142" cy="67" rx="11" ry="7" />
          </g>
          <path d="M95 150 L125 124 L150 138 L180 116 L225 142 V160 H95Z" fill="#8a9bc8" />
          <rect x="95" y="150" width="130" height="60" fill="#2f71c3" />
          <g stroke="#fff" opacity="0.5" strokeLinecap="round">
            <line x1="108" y1="166" x2="120" y2="166" />
            <line x1="140" y1="180" x2="156" y2="180" />
          </g>
          <path d="M150 172 V156 L159 172Z" fill="#fff" />
          <path d="M190 210 Q196 160 225 150 V210Z" fill="#6c9a4f" />
          <rect x="200" y="164" width="12" height="9" fill="#f7efe3" />
          <path d="M198 165 L206 159 L214 165Z" fill="#d9824f" />
          <ellipse cx="196" cy="168" rx="3" ry="14" fill="#2f5e3a" />
        </>
      );
    case "mountain":
      return (
        <>
          <path d="M95 160 L135 92 L160 126 L182 100 L225 160Z" fill="#8a9bb8" />
          <path d="M135 92 L124 111 L133 106 L141 113 L146 102Z" fill="#fff" />
          <path d="M182 100 L173 114 L182 110 L190 116Z" fill="#fff" />
          <path d="M95 170 Q150 140 225 162 V210 H95Z" fill="#7fae62" />
          <g fill="#2f5a3c">
            {[104, 118, 206, 218].map((x, i) => (
              <path key={x} d={`M${x} ${i % 2 ? 176 : 170} l8 26 h-16z`} />
            ))}
          </g>
          <path d="M150 170 h24 v16 h-24z" fill="#8d5b31" />
          <path d="M146 171 L162 158 L178 171Z" fill="#6b3f22" />
          <rect x="159" y="176" width="6" height="10" fill="#f6d27a" />
        </>
      );
    case "desert":
      return (
        <>
          <circle cx="160" cy="130" r="18" fill="#fde7a8" className="ws-day" />
          <path d="M95 158 Q135 138 170 152 T225 148 V210 H95Z" fill="#e2a56b" />
          <path d="M95 178 Q150 160 225 176 V210 H95Z" fill="#cf8a52" />
          <g fill="#4f7a45">
            <rect x="196" y="140" width="7" height="44" rx="3.5" />
            <rect x="186" y="150" width="6" height="16" rx="3" />
            <rect x="186" y="162" width="12" height="5" rx="2.5" />
            <rect x="206" y="146" width="6" height="14" rx="3" />
            <rect x="201" y="156" width="11" height="5" rx="2.5" />
          </g>
        </>
      );
    case "city":
      return (
        <>
          <rect x="95" y="168" width="130" height="42" fill="#5d86c8" />
          <g>
            {[
              [100, 132, 18, "#f6e3c7"],
              [120, 120, 16, "#f3c8b5"],
              [138, 138, 20, "#fbeedd"],
              [160, 112, 14, "#e9d2ea"],
              [176, 128, 20, "#f6e3c7"],
              [198, 136, 22, "#f3c8b5"],
            ].map(([x, y, w, c]) => (
              <g key={x as number}>
                <rect x={x as number} y={y as number} width={w as number} height={170 - (y as number)} fill={c as string} />
                <rect x={x as number} y={(y as number) - 4} width={w as number} height={5} fill="#c9714a" />
                <rect x={(x as number) + 4} y={(y as number) + 8} width={4} height={6} fill="#f6d27a" />
              </g>
            ))}
          </g>
          <path d="M150 112 V96 M146 100 H154" stroke="#c9714a" strokeWidth="2" />
          <g stroke="#fff" opacity="0.5" strokeLinecap="round">
            <line x1="110" y1="186" x2="126" y2="186" />
            <line x1="170" y1="196" x2="188" y2="196" />
          </g>
        </>
      );
  }
}

/*
 * Small arched-window vignette used on stay cards. It follows the site theme:
 * at night the sky fades to dark with a moon and stars,
 * the view and the room dim, and the lights in the view come on. The `ws-*`
 * rules in globals.css fade the night layers with the theme switch.
 */
export function WindowScene({ variant, id }: { variant: SceneVariant; id: string }) {
  const p = palettes[variant];
  return (
    <svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="1" stopColor={p.skyBottom} />
        </linearGradient>
        <linearGradient id={`${id}-night`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.nightTop} />
          <stop offset="1" stopColor={p.nightBottom} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={ARCH} />
        </clipPath>
      </defs>
      <rect width="320" height="240" fill={p.wall} />
      <path d="M83 208 V95 A77 77 0 0 1 237 95 V208 Z" fill={p.reveal} />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="95" y="20" width="130" height="190" fill={`url(#${id}-sky)`} />
        <rect x="95" y="20" width="130" height="190" fill={`url(#${id}-night)`} className="ws-night" />
        <View variant={variant} />
        {/* Night: dim the view, then stars, moon and lit windows over it */}
        <g className="ws-night">
          <rect x="95" y="20" width="130" height="190" fill="#1c2150" opacity="0.4" />
          <g fill="#fff">
            {STARS.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" />
            ))}
          </g>
          <circle cx="196" cy="62" r="13" fill="#fff7e6" opacity="0.25" />
          <circle cx="196" cy="62" r="7.5" fill="#fff7e6" />
          {NIGHT_LIGHTS[variant].map(([x, y, w, h]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x + w / 2} cy={y + h / 2} r={Math.max(w, h) * 1.1} fill="#ffd98a" opacity="0.35" />
              <rect x={x} y={y} width={w} height={h} fill="#ffe3a0" />
            </g>
          ))}
        </g>
      </g>
      <rect x="76" y="200" width="168" height="10" rx="2" fill="#fbf5ec" />
      <rect x="0" y="210" width="320" height="30" fill="#000" opacity="0.04" />
      {/* Vase on the sill */}
      <path d="M222 178 h14 l-2 22 h-10z" fill="#3f67c9" />
      <g fill="#5e8f48">
        <ellipse cx="224" cy="170" rx="9" ry="3.5" transform="rotate(-40 224 170)" />
        <ellipse cx="234" cy="168" rx="9" ry="3.5" transform="rotate(35 234 168)" />
      </g>
      {/* Night: the room around the window dims */}
      <path d={ROOM} fillRule="evenodd" fill="#1c2150" fillOpacity="0.42" className="ws-night" />
    </svg>
  );
}
