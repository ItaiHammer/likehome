// Dates are kept as "YYYY-MM-DD" strings in the guest's own calendar.
export const DAY = 86_400_000;

export const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export const fromUTC = (t: number) => new Date(t).toISOString().slice(0, 10);

export const addDays = (iso: string, days: number) => fromUTC(toUTC(iso) + days * DAY);

export const nightsBetween = (a: string, b: string) =>
  a && b ? Math.max(0, Math.round((toUTC(b) - toUTC(a)) / DAY)) : 0;

const format = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(toUTC(iso)).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });

/** "Wed, Oct 14" */
export const formatDate = (iso: string) => format(iso, { weekday: "short", month: "short", day: "numeric" });
/** "Oct 14" */
export const formatShort = (iso: string) => format(iso, { month: "short", day: "numeric" });
/** "Oct 14 - Oct 17" */
export const formatRange = (from: string, to: string) => `${formatShort(from)} - ${formatShort(to)}`;
/** "Wednesday, October 14" (for screen readers) */
export const formatLong = (iso: string) => format(iso, { weekday: "long", month: "long", day: "numeric" });
/** "Wed", or "Wednesday" when long */
export const formatWeekday = (iso: string, long = false) => format(iso, { weekday: long ? "long" : "short" });

// A calendar month; m counts from 0 like Date
export type Month = { y: number; m: number };

export const monthOf = (iso: string): Month => {
  const [y, m] = iso.split("-").map(Number);
  return { y, m: m - 1 };
};

export const shiftMonth = ({ y, m }: Month, delta: number): Month => {
  const t = y * 12 + m + delta;
  return { y: Math.floor(t / 12), m: t % 12 };
};

/** "December 2026" */
export const formatMonth = ({ y, m }: Month) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** The month's days as YYYY-MM-DD, after a null for each weekday before the 1st (weeks start on Sunday) */
export function monthCells({ y, m }: Month): (string | null)[] {
  const lead = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const first = fromUTC(Date.UTC(y, m, 1));
  return [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, d) => addDays(first, d))];
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** The browser's IANA time zone, e.g. "America/Los_Angeles". Sent with searches and
 *  bookings so the server judges "today" in the guest's calendar, not UTC. */
export const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
};
