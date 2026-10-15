// No Supabase / Next.js / network imports here so it can be unit tested with `npm test`.
import { bedSizes, tags as filterTags } from '../../app/search/types.ts'
import type { BedSize, Tag } from '../../app/search/types.ts'
import type { LiteHotelDetail, LiteHotelSummary, LiteOffer, LiteRoom } from './types.ts'

// city/region/country come from here, never from LiteAPI: search matches them exactly ("USA" + full state name)
export type Target = { countryCode: string; cityName: string; city: string; region: string | null; country: string }

export type HotelRow = {
  liteapi_id: string
  name: string
  description: string
  address: string
  city: string
  region: string | null
  country: string
  photo_urls: string[]
  rating: number | null
  latitude: number | null
  longitude: number | null
  tags: Tag[]
}

export type RoomRow = {
  liteapi_room_id: string
  room_type: string
  capacity: number
  max_adults: number | null
  max_children: number | null
  num_beds: number
  bed_size: BedSize | null
  price_per_night: number
  tags: Tag[]
}

export type SamplePrices = {
  mapped: boolean
  byRoom: Map<string, number>
  byName: Map<string, number>
  cheapest: number
}

type Bed = { id?: number; quantity?: number; bedType?: string; bedSize?: string }

const MAX_PHOTOS = 12

const ENTITIES: Record<string, string> = { amp: '&', nbsp: ' ', quot: '"', '#39': "'", lt: '<', gt: '>' }

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>|<\/(?:p|li|div|h[1-6])\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    // One pass, so "&amp;lt;" ends up as the text "&lt;" rather than "<"
    .replace(/&(amp|nbsp|quot|#39|lt|gt);/g, (_, name: string) => ENTITIES[name])
    .replace(/\s+/g, ' ')
    .trim()
}

const BED_KEYWORDS: [RegExp, BedSize][] = [
  [/twin\s*xl/, 'Twin XL'],
  [/super-?king|extra-large/, 'King'],
  [/king/, 'King'],
  [/queen/, 'Queen'],
  [/double|full/, 'Double'],
  [/twin|single|bunk/, 'Twin'],
]

// 151-180 cm holds both 10 "King bed" and 167 "Queen bed", so their width can't tell them apart.
// 100 "Large bed" is only on rooms named Queen.
const BED_TYPE_SIZES = new Map<number, BedSize>([[10, 'King'], [167, 'Queen'], [100, 'Queen']])

function sizeOfBed(bed: Bed): BedSize | null {
  const byId = BED_TYPE_SIZES.get(Number(bed.id))
  if (byId) return byId
  const width = /(\d{2,3})\s*-\s*(\d{2,3})\s*cm/i.exec(bed.bedSize ?? '')
  if (width) {
    // Booking.com calls 151-180 cm "King size", but a US queen is 152 cm wide
    const upper = Number(width[2])
    return upper <= 130 ? 'Twin' : upper <= 150 ? 'Double' : upper <= 180 ? 'Queen' : 'King'
  }
  const type = (bed.bedType ?? '').toLowerCase()
  return BED_KEYWORDS.find(([pattern]) => pattern.test(type))?.[1] ?? null
}

export function bedSizeFor(beds: Bed[]): BedSize | null {
  const real = beds.filter((bed) => !/sofa|futon/i.test(bed.bedType ?? ''))
  let best: BedSize | null = null
  for (const bed of real.length ? real : beds) {
    const size = sizeOfBed(bed)
    if (size && (!best || bedSizes.indexOf(size) > bedSizes.indexOf(best))) best = size
  }
  return best
}

// OR / COMPLEX list alternative layouts, so only one of them is in the room
function chosenBeds(room: LiteRoom): Bed[] {
  const beds = room.bedTypes ?? []
  return room.bedRelation === 'OR' || room.bedRelation === 'COMPLEX' ? beds.slice(0, 1) : beds
}

const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0)

const childLimit = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null)

export function numBedsFor(room: LiteRoom): number {
  return Math.max(1, chosenBeds(room).reduce((sum, bed) => sum + count(bed.quantity), 0))
}

export function capacityFor(room: LiteRoom): number {
  return count(room.maxOccupancy ?? count(room.maxAdults) + count(room.maxChildren)) || 2
}

function amenityIds(room: LiteRoom): Set<number> {
  return new Set((room.roomAmenities ?? []).map((amenity) => Number(amenity?.amenitiesId)))
}

const hasAny = (ids: Set<number>, wanted: number[]) => wanted.some((id) => ids.has(id))

const inTagOrder = (found: Set<Tag>): Tag[] => filterTags.filter((tag) => found.has(tag))

const ROOM_TAGS: [Tag, number[]][] = [
  ['Free Wi-Fi', [118]],
  ['Housekeeping', [77, 161, 380, 365]],
  ['Kitchen', [183, 186]],
  ['Washer & Dryer', [379, 378, 14, 90, 364]],
  ['Pool', [2, 272, 271, 253]],
  ['ADA Compliant', [382, 384, 285, 383]],
]

export function roomTagsFor(room: LiteRoom): Tag[] {
  const ids = amenityIds(room)
  return inTagOrder(new Set(ROOM_TAGS.filter(([, wanted]) => hasAny(ids, wanted)).map(([tag]) => tag)))
}

type FacilityRule = { tags: Tag[]; ids?: number[]; match?: RegExp; unless?: RegExp }

const FAMILY_ROOMS = 28
const ADULT_ONLY = 149
export const KIDS_FACILITIES = [21, 56, 144, 148, 172, 173, 174, 176, 177, 214, 258, 495, 570, 652, 696, 697, 737, 770, 890, 891]

const FACILITY_RULES: FacilityRule[] = [
  { tags: ['Parking'], match: /parking|garage/, unless: /no parking/ },
  { tags: ['EV Charging'], match: /electric vehicle|\bev charg/ },
  { tags: ['Pool'], match: /(?:swimming|outdoor|indoor|infinity|rooftop|heated|plunge|salt ?water) pool|^pool$/, unless: /pool table|billiard|pool view/ },
  { tags: ['Gym'], match: /fitness|gym/ },
  { tags: ['Gift Shops'], match: /gift shop|shopping on site|minimarket|convenience store/ },
  { tags: ['Washer & Dryer'], match: /laundry facilities|launderette|self-service laundry/ },
  { tags: ['Free Wi-Fi'], match: /^free wi-?fi/ },
  { tags: ['Housekeeping'], match: /housekeeping/ },
  { tags: ['Pets'], match: /pets allowed|pet friendly/, unless: /no pets/ },
  { tags: ['Kids', 'Families'], ids: KIDS_FACILITIES },
  { tags: ['Families'], ids: [FAMILY_ROOMS] },
]

type Facility = { id: number | null; name: string }

const facilityName = (name: unknown) => (typeof name === 'string' ? name.trim().toLowerCase() : '')

// hotelFacilities is a plain list of names, so each takes the id of the facilities entry with that name
function facilitiesOf(d: LiteHotelDetail): Facility[] {
  const listed = (d.facilities ?? []).map((facility) => ({ id: finiteOrNull(Number(facility?.facilityId)), name: facilityName(facility?.name) }))
  const idByName = new Map(listed.map(({ id, name }) => [name, id]))
  const named = (d.hotelFacilities ?? []).map(facilityName).filter(Boolean).map((name) => ({ id: idByName.get(name) ?? null, name }))
  // Rules go by id, so a listed facility with no name still counts
  return [...listed.filter(({ id, name }) => id !== null || name), ...named]
}

const rulesFor = ({ id, name }: Facility) => FACILITY_RULES.filter((rule) =>
  (id !== null && rule.ids?.includes(id)) || (rule.match?.test(name) && !rule.unless?.test(name)))

export function unmappedFacilities(d: LiteHotelDetail): string[] {
  const unmapped = facilitiesOf(d).filter((facility) => facility.name && facility.id !== ADULT_ONLY && rulesFor(facility).length === 0)
  return [...new Set(unmapped.map(({ name }) => name))]
}

// Some hotels list 149 but have rooms for children (an adults-only area?), so the rooms must agree.
// A room with 0 max adults has unknown limits and counts neither way.
export function isAdultsOnly(d: LiteHotelDetail): boolean {
  if (!facilitiesOf(d).some(({ id }) => id === ADULT_ONLY)) return false
  const known = (d.rooms ?? []).filter((room) => count(room.maxAdults) > 0)
  return known.length > 0 && known.every((room) => room.maxChildren === 0)
}

const POOL_AMENITIES = [155, 174, 287, 294, 257, 306, 254, 255, 109]
const GYM_AMENITIES = [123, 390, 334, 363, 128]
const PET_AMENITIES = [250]
const CRIB_AMENITIES = [74, 121, 362]
const KID_AMENITIES = [17, 18, 19, 36, 48, 50, 51, 52, 53, 54, 55, 159, 170, 241, 168]
const PRIVATE_SPA_AMENITIES = [160, 172, 173, 238, 242, 243, 273, 274, 275, 333, 2, 253, 271, 272]
const GROUP_AMENITIES = [183, 186, 84, 85, 298, 302, 303, 304, 305, 328, 9, 10, 299]

const moneyOf = (total: unknown) => (Array.isArray(total) ? total[0] : total) as { amount?: unknown; currency?: unknown } | null | undefined

// Placeholder and package offers come with a null total; those, and non-USD ones, are not prices
function offerTotal(offer: LiteOffer): number | null {
  if (!offer?.offerId || !Array.isArray(offer.rates) || offer.rates.length === 0) return null
  let total = 0
  for (const rate of offer.rates) {
    const money = moneyOf(rate?.retailRate?.total)
    if (!money || money.currency !== 'USD' || typeof money.amount !== 'number' || !Number.isFinite(money.amount)) return null
    total += money.amount
  }
  return total > 0 ? total : null
}

const pricedOffers = (offers: LiteOffer[] | undefined) => (offers ?? []).filter((offer) => offerTotal(offer) !== null)

const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

const keepCheapest = (map: Map<string, number>, key: string, price: number) => {
  if (!map.has(key) || price < map.get(key)!) map.set(key, price)
}

export function samplePricesFor(offers: LiteOffer[] | undefined, nights = 1): SamplePrices | null {
  const sample: SamplePrices = { mapped: false, byRoom: new Map(), byName: new Map(), cheapest: Infinity }
  for (const offer of pricedOffers(offers)) {
    const perNight = offerTotal(offer)! / nights
    const first = offer.rates![0]
    const mappedRoomId = first.mappedRoomId ?? offer.mappedRoomId
    if (mappedRoomId !== undefined && mappedRoomId !== null && String(mappedRoomId) !== '') {
      sample.mapped = true
      keepCheapest(sample.byRoom, String(mappedRoomId), perNight)
    }
    const name = normalizeName(first.name ?? '')
    if (name) keepCheapest(sample.byName, name, perNight)
    sample.cheapest = Math.min(sample.cheapest, perNight)
  }
  return Number.isFinite(sample.cheapest) ? sample : null
}

// Only when every priced offer has a meal plan, so the cheapest live rate will include meals too
function allOffersIncludeMeals(offers: LiteOffer[] | undefined): boolean {
  const priced = pricedOffers(offers)
  return priced.length > 0 && priced.every((offer) => offer.rates!.every((rate) => {
    const board = (rate.boardType ?? '').trim().toUpperCase()
    return board !== '' && board !== 'RO'
  }))
}

// Couples and Friends describe one bookable room, so only the imported `rooms` count for them (an adults-only
// hotel is Couples as a whole); hotel-wide facts (pool, gym, cribs, pets) may come from any room type of the hotel.
export function hotelTagsFor(d: LiteHotelDetail, offers: LiteOffer[] | undefined, rooms: LiteRoom[] = d.rooms ?? []): Tag[] {
  const found = new Set<Tag>(facilitiesOf(d).flatMap((facility) => rulesFor(facility).flatMap((rule) => rule.tags)))
  const allIds = new Set((d.rooms ?? []).flatMap((room) => [...amenityIds(room)]))

  // The docs' example has a "Pets allowed" facility with petsAllowed:false, so false never removes Pets
  if (d.petsAllowed === true || hasAny(allIds, PET_AMENITIES)) found.add('Pets')
  if (d.parking === true) found.add('Parking')
  if (hasAny(allIds, POOL_AMENITIES)) found.add('Pool')
  if (hasAny(allIds, GYM_AMENITIES)) found.add('Gym')
  if (hasAny(allIds, CRIB_AMENITIES)) found.add('Cribs')
  if (hasAny(allIds, KID_AMENITIES)) found.add('Kids').add('Families')
  if (allOffersIncludeMeals(offers)) found.add('Free Meals')
  if (rooms.some((room) => hasAny(amenityIds(room), PRIVATE_SPA_AMENITIES))) found.add('Couples')
  if (rooms.some((room) => capacityFor(room) >= 4 && hasAny(amenityIds(room), GROUP_AMENITIES))) found.add('Friends')

  if (isAdultsOnly(d)) {
    found.delete('Kids')
    found.delete('Families')
    found.delete('Cribs')
    found.add('Couples')
  }
  return inTagOrder(found)
}

const finiteOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

// Star class, never the 0-10 review score: hotels.rating is a 0..5 star rating
function ratingFor(...candidates: unknown[]): number | null {
  const stars = candidates.map(Number).find((value) => Number.isFinite(value) && value > 0)
  return stars === undefined ? null : Math.round(Math.min(stars, 5) * 10) / 10
}

const orderOf = (order: unknown) => finiteOrNull(order) ?? Number.MAX_SAFE_INTEGER

function photosFor(s: LiteHotelSummary, d: LiteHotelDetail): string[] {
  const images = [...(d.hotelImages ?? [])].sort((a, b) =>
    Number(Boolean(b.defaultImage)) - Number(Boolean(a.defaultImage)) || orderOf(a.order) - orderOf(b.order))
  const urls = [...new Set(images.map((image) => (image.urlHd || image.url || '').trim()).filter(Boolean))]
  if (urls.length) return urls.slice(0, MAX_PHOTOS)
  return [d.main_photo, s.main_photo].map((url) => (url ?? '').trim()).filter(Boolean).slice(0, 1)
}

export function hotelRowFor(target: Target, s: LiteHotelSummary, d: LiteHotelDetail, offers?: LiteOffer[], rooms?: LiteRoom[]): HotelRow {
  return {
    liteapi_id: s.id,
    name: (d.name || s.name || '').trim(),
    description: stripHtml(d.hotelDescription ?? s.hotelDescription ?? ''),
    address: (d.address ?? s.address ?? '').trim(),
    city: target.city,
    region: target.region,
    country: target.country,
    photo_urls: photosFor(s, d),
    rating: ratingFor(s.stars, d.starRating),
    latitude: finiteOrNull(s.latitude) ?? finiteOrNull(d.location?.latitude),
    longitude: finiteOrNull(s.longitude) ?? finiteOrNull(d.location?.longitude),
    tags: hotelTagsFor(d, offers, rooms),
  }
}

type Candidate = { priced: boolean; price: number; row: RoomRow }

// A repeated room id keeps its first room: one upsert can't touch the same (hotel_id, liteapi_room_id) twice
export function roomRowsFor(rooms: LiteRoom[] | undefined, sample: SamplePrices, maxRooms = 10, adultsOnly = false): RoomRow[] {
  const seen = new Set<string>()
  const candidates: Candidate[] = []
  for (const room of rooms ?? []) {
    const id = typeof room?.id === 'number' || typeof room?.id === 'string' ? String(room.id) : ''
    const name = typeof room?.roomName === 'string' ? room.roomName.trim() : ''
    if (!id || !name || seen.has(id)) continue
    seen.add(id)
    // Unmapped hotels fall back to the rate's room name, as live prices do
    const own = sample.byRoom.get(id) ?? (sample.mapped ? undefined : sample.byName.get(normalizeName(name)))
    const price = own ?? sample.cheapest
    // A 0/0/N room lists no limits, so its 0 children is unknown too, not a real 0
    const adults = count(room.maxAdults)
    const children = adults ? childLimit(room.maxChildren) : null
    candidates.push({
      priced: own !== undefined,
      price,
      row: {
        liteapi_room_id: id,
        room_type: name,
        capacity: capacityFor(room),
        max_adults: adults || null,
        max_children: adultsOnly ? 0 : children,
        num_beds: numBedsFor(room),
        bed_size: bedSizeFor(chosenBeds(room)),
        price_per_night: Math.round(price),
        tags: roomTagsFor(room),
      },
    })
  }
  return candidates
    .sort((a, b) => Number(b.priced) - Number(a.priced) || a.price - b.price)
    .slice(0, Math.max(0, maxRooms))
    .map((candidate) => candidate.row)
}

const HOTEL_COLUMNS = ['liteapi_id', 'name', 'description', 'address', 'city', 'region', 'country', 'photo_urls', 'rating', 'latitude', 'longitude', 'tags'] as const
const ROOM_COLUMNS = ['liteapi_room_id', 'room_type', 'capacity', 'max_adults', 'max_children', 'num_beds', 'bed_size', 'price_per_night', 'tags'] as const
// Postgres types an all-null VALUES column as text, which an integer column won't take
const ROOM_SELECT = ROOM_COLUMNS.map((column) => (column === 'max_adults' || column === 'max_children' ? `v.${column}::integer` : `v.${column}`)).join(', ')

// Postgres text can't hold NUL. standard_conforming_strings is on, so only quotes need escaping.
const sqlString = (value: string) => `'${value.replaceAll('\u0000', '').replaceAll("'", "''")}'`

function sqlValue(value: string | number | null | readonly string[]): string {
  if (value === null) return 'null'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Not a finite number: ${value}`)
    return String(value)
  }
  if (typeof value === 'string') return sqlString(value)
  return `array[${value.map(sqlString).join(', ')}]::text[]`
}

const updateSet = (columns: readonly string[]) => columns.map((column) => `${column} = excluded.${column}`).join(', ')

// Same upserts as the Supabase path. Rooms missing from a later run are never deleted (reservations point at them).
export function hotelSql(hotel: HotelRow, rooms: RoomRow[]): string {
  let sql = `insert into public.hotels (${HOTEL_COLUMNS.join(', ')})\n` +
    `values (${HOTEL_COLUMNS.map((column) => sqlValue(hotel[column])).join(', ')})\n` +
    `on conflict (liteapi_id) do update set ${updateSet(HOTEL_COLUMNS.filter((column) => column !== 'liteapi_id'))};\n`
  if (rooms.length) {
    sql += `insert into public.rooms (hotel_id, ${ROOM_COLUMNS.join(', ')})\n` +
      `select h.id, ${ROOM_SELECT} from (values\n` +
      rooms.map((room) => `  (${ROOM_COLUMNS.map((column) => sqlValue(room[column])).join(', ')})`).join(',\n') +
      `\n) v(${ROOM_COLUMNS.join(', ')})\n` +
      `join public.hotels h on h.liteapi_id = ${sqlString(hotel.liteapi_id)}\n` +
      `on conflict (hotel_id, liteapi_room_id) do update set ${updateSet(ROOM_COLUMNS.filter((column) => column !== 'liteapi_room_id'))};\n`
  }
  return sql
}
