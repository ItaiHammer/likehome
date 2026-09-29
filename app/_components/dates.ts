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
/** "Wednesday, October 14" (for screen readers) */
export const formatLong = (iso: string) => format(iso, { weekday: "long", month: "long", day: "numeric" });

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
