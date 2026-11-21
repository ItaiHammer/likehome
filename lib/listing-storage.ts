// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// The listing editor works in its own vocabulary (ISO country codes, amenity ids like "wifi"),
// but search_hotels and the stay page read the hotels table in the search vocabulary
// ("USA" / full country names, tags like "Free Wi-Fi"). These translate on save and on load,
// so owner-created listings are found by location and amenity filters (audit F2).
import { AMENITIES, type Amenity } from '../types/listing.ts'

// How the hotels table spells each editor country. The US is stored as "USA" (seed and import
// data, and search maps "United States" to it); other countries by their full English name.
const STORED_COUNTRY: Record<string, string> = {
  US: 'USA',
  CA: 'Canada',
  MX: 'Mexico',
  GB: 'United Kingdom',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  JP: 'Japan',
  AU: 'Australia',
}

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' })

export function countryToStored(country: string): string {
  const input = country.trim()
  const lower = input.toLowerCase()
  if (['us', 'usa', 'u.s.', 'u.s.a.', 'united states', 'united states of america'].includes(lower)) return 'USA'
  if (['gb', 'uk', 'u.k.', 'united kingdom'].includes(lower)) return 'United Kingdom'
  for (const [code, stored] of Object.entries(STORED_COUNTRY)) {
    if (lower === code.toLowerCase() || lower === stored.toLowerCase()) return stored
  }
  // Valid ISO codes outside the original nine-country dropdown must not be saved
  // literally as "DE"/"BR": searches use readable country names.
  if (/^[a-z]{2}$/i.test(input)) return REGION_NAMES.of(input.toUpperCase()) ?? input
  return input
}

// Back to the editor's ISO code. Also accepts rows saved before this fix (the bare ISO code)
// and spelled-out US names, so older listings still open with their country selected.
export function countryFromStored(value: string | null | undefined): string {
  const v = (value ?? '').trim()
  if (!v) return ''
  const lower = v.toLowerCase()
  if (['usa', 'us', 'united states', 'united states of america'].includes(lower)) return 'US'
  for (const [code, name] of Object.entries(STORED_COUNTRY)) {
    if (lower === code.toLowerCase() || lower === name.toLowerCase()) return code
  }
  return v
}

// Editor amenity → the tag search filters on and the stay page shows. Amenities with a search
// equivalent use that exact tag; the rest are stored as readable labels so the stay page can
// still list them (search simply has no filter for them yet).
const AMENITY_TAG: Record<Amenity, string> = {
  wifi: 'Free Wi-Fi',
  parking: 'Parking',
  pool: 'Pool',
  fitness_center: 'Gym',
  family_rooms: 'Families',
  restaurant: 'Restaurant',
  air_conditioning: 'Air conditioning',
  step_free_entrance: 'Step-free entrance',
  elevator: 'Elevator',
  accessible_parking: 'Accessible parking',
}

export function amenitiesToTags(amenities: readonly Amenity[]): string[] {
  return AMENITIES.filter((a) => amenities.includes(a)).map((a) => AMENITY_TAG[a])
}

// Tags → editor amenities, in AMENITIES order. Also accepts the raw ids older saves used ("wifi").
// Tags with no editor amenity (e.g. imported "EV Charging") are left alone by the editor.
export function amenitiesFromTags(tags: readonly string[] | null | undefined): Amenity[] {
  const have = new Set((tags ?? []).map((t) => t.toLowerCase()))
  return AMENITIES.filter((a) => have.has(a) || have.has(AMENITY_TAG[a].toLowerCase()))
}

// Saving the amenities tab must not drop tags the editor doesn't manage (imported or set
// elsewhere): keep those, and replace only the ones the editor owns.
export function mergeAmenityTags(existing: readonly string[] | null | undefined, amenities: readonly Amenity[]): string[] {
  const managed = new Set<string>(AMENITIES.flatMap((a) => [a, AMENITY_TAG[a]]).map((t) => t.toLowerCase()))
  const kept = (existing ?? []).filter((t) => !managed.has(t.toLowerCase()))
  return [...kept, ...amenitiesToTags(amenities)]
}
