/*
 * The LikeHome mark: a tilted doorway tag with a cord running from its ring
 * down to a bead inside the doorway. The cord is cut out where it crosses
 * the tag and drawn in the tag's color where it hangs in the opening.
 * Drawn in currentColor, so it takes the text color it's placed in.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-4 -6 108 120" className={className} fill="currentColor" aria-hidden>
      <defs>
        <mask id="likehome-mark-cut">
          <rect x="-10" y="-10" width="130" height="140" fill="#fff" />
          <circle cx="81" cy="17" r="3.8" fill="#000" />
          <path d="M81 17 C 84 31, 82 45, 72 56" fill="none" stroke="#000" strokeWidth="3.4" strokeLinecap="round" />
        </mask>
        <clipPath id="likehome-mark-door">
          <path d="M28 104 V49 A22 22 0 0 1 72 49 V104 Z" />
        </clipPath>
      </defs>
      <g transform="rotate(-9 50 55)">
        <path
          mask="url(#likehome-mark-cut)"
          d="M18 6 H82 A10 10 0 0 1 92 16 V99 A5 5 0 0 1 87 104 H77 A5 5 0 0 1 72 99 V49 A22 22 0 0 0 28 49 V99 A5 5 0 0 1 23 104 H13 A5 5 0 0 1 8 99 V16 A10 10 0 0 1 18 6 Z"
        />
        <path
          clipPath="url(#likehome-mark-door)"
          d="M81 17 C 84 31, 82 45, 72 56 C 66 63, 58 66, 51 68"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <circle cx="49" cy="68" r="4.4" />
      </g>
    </svg>
  );
}
