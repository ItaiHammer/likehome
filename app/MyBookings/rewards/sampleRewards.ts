import type { PointsActivity } from "@/lib/rewards";

// Dev-only data for ?sample, like ../sampleBookings.ts. Earned rows show what the design expects once earning exists.
export const SAMPLE_BALANCE = 40450;

const rows: [PointsActivity["type"], number, string, string | null][] = [
  ["earn", 1240, "2026-09-18T18:00:00Z", "Casa Maré"],
  ["redeem", -2000, "2026-08-04T18:00:00Z", "Harbor & Pine"],
  ["earn", 5000, "2025-12-01T18:00:00Z", "Grand Hilton"],
  ["redeem", -5000, "2025-10-27T18:00:00Z", "The Salt House"],
  ["refund", 18900, "2025-10-02T18:00:00Z", "Sunset Beach Resort"],
  ["earn", 3200, "2025-09-14T18:00:00Z", "Pine Ridge Lodge"],
  ["redeem", -1500, "2025-08-22T18:00:00Z", "Casa Maré"],
  ["earn", 2600, "2025-07-30T18:00:00Z", "Harbor & Pine"],
  ["earn", 4100, "2025-06-11T18:00:00Z", "Desert Bloom Inn"],
  ["adjust", 500, "2025-05-03T18:00:00Z", null],
  ["earn", 6100, "2025-04-19T18:00:00Z", "The Salt House"],
  ["redeem", -3000, "2025-03-08T18:00:00Z", "Grand Hilton"],
  ["earn", 7310, "2025-02-15T18:00:00Z", "Lakeside Cabins"],
];

export function getSampleActivity(): PointsActivity[] {
  return rows.map(([type, points, createdAt, hotelName], i) => ({ id: `sample-${i}`, type, points, createdAt, hotelName }));
}
