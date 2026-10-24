// LiteAPI's city lists take in same-named towns far away (Lake Placid, Florida under Lake Placid, New York), and many
// of their zips carry no state, so the import keeps only hotels near the city
export const CITY_RADIUS_KM = 50

type Point = readonly [number, number]

export function distanceKm(a: Point, b: Point): number {
  const rad = Math.PI / 180
  const h = Math.sin(((b[0] - a[0]) * rad) / 2) ** 2 +
    Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(((b[1] - a[1]) * rad) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/** True when the hotel's coordinates put it beyond the radius; a hotel without coordinates isn't judged */
export function farFrom(s: { latitude?: number | null; longitude?: number | null }, center: Point, km = CITY_RADIUS_KM): boolean {
  const lat = Number(s.latitude)
  const lng = Number(s.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return false
  return distanceKm([lat, lng], center) > km
}
