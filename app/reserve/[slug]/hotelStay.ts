import { getHotel } from "@/utils/hotels";
import { getBookedNights, getRoomsByHotel } from "@/utils/rooms";
import { roomAmenityList, stayOffers } from "@/lib/stay-filters";
import { getRoomRates, liveRatesEnabled, quoteForRoom, type StayQuery } from "@/lib/liteapi/rates";
import { saveOfferedRooms } from "@/lib/liteapi/save";
import { nightsByRoom } from "@/lib/room-availability";
import { addDays } from "@/app/_components/dates";
import { todayUTC } from "@/utils/reservation-logic";
import type { Room, Stay } from "../../_data/stays";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type HotelRow = {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  country: string | null;
  photo_urls: string[] | null;
  rating: number | string | null;
  tags: string[] | null;
  liteapi_id: string | null;
};

type RoomRow = {
  id: string;
  room_type: string;
  price_per_night: number | string;
  capacity: number | null;
  max_adults?: number | null;
  max_children?: number | null;
  num_beds: number | null;
  bed_size: string | null;
  tags: string[] | null;
  liteapi_room_id: string | null;
};

// num_beds defaults to 1 in the database, so without a bed size the count was never filled in
function bedLabel(count: number | null, size: string | null) {
  if (!size) return "";
  const n = count ?? 1;
  return `${n} ${size.toLowerCase().replace("xl", "XL")} bed${n === 1 ? "" : "s"}`;
}

const roomOf = (r: RoomRow): Room => ({
  id: r.id,
  name: r.room_type,
  // The room's own amenities, the same tags search filters on
  description: [bedLabel(r.num_beds, r.bed_size), ...roomAmenityList(r.tags)].filter(Boolean).join(" · "),
  sleeps: r.capacity ?? 2,
  maxAdults: r.max_adults ?? null,
  maxChildren: r.max_children ?? null,
  nightly: Number(r.price_per_night),
  beds: r.num_beds ?? 1,
  bedSize: r.bed_size,
  tags: r.tags ?? [],
  liteapiRoomId: r.liteapi_room_id,
});

/** A database hotel and its rooms, shaped like the sample stays so the same page can show it. */
export async function getHotelStay(id: string): Promise<Stay | null> {
  // Anything that isn't a hotel id would only make the database query fail
  if (!UUID.test(id)) return null;

  const [hotelResult, roomsResult] = await Promise.all([getHotel(id), getRoomsByHotel(id)]);
  // Only a missing hotel (.single() found no row: PGRST116) is "not found". Any other failure throws, so
  // the pages show their Try again screen instead of calling the hotel unlisted.
  if (roomsResult.error) throw new Error(roomsResult.error.message);
  if (hotelResult.error && hotelResult.error.code !== "PGRST116") throw new Error(hotelResult.error.message);
  const hotel = hotelResult.data as HotelRow | null;
  const rows = (roomsResult.data ?? []) as RoomRow[];
  if (!hotel || rows.length === 0) return null;

  // Which nights each room is booked (audit F9). A day before UTC today covers guests west of UTC.
  // If the lookup fails, every night shows as open and checkout still refuses a booked room.
  const from = addDays(todayUTC(), -1);
  const to = addDays(from, 400);
  const booked = await getBookedNights(id, from, to);
  if (booked.error) console.error("get_booked_nights failed:", booked.error.message);
  const bookedNights = nightsByRoom(booked.data ?? []);

  // Identical rooms (same type, price, beds, limits and amenities) show as one card. Booking picks
  // whichever of them is free for the guest's dates; the card's id is the first one's. LiteAPI rooms
  // never group: each has its own live quote.
  const groups = new Map<string, RoomRow[]>();
  for (const row of rows) {
    const key = JSON.stringify([
      row.room_type,
      Number(row.price_per_night),
      row.capacity,
      row.max_adults ?? null,
      row.max_children ?? null,
      row.num_beds,
      row.bed_size,
      [...(row.tags ?? [])].sort(),
      row.liteapi_room_id,
    ]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const rooms: Room[] = [...groups.values()]
    .map((units) => ({ ...roomOf(units[0]), units: units.map((u) => ({ id: u.id, bookedNights: bookedNights.get(u.id) ?? [] })) }))
    .sort((a, b) => a.nightly - b.nightly);

  const rating = hotel.rating === null ? null : Number(hotel.rating);
  const tags = hotel.tags ?? [];

  const stay: Stay = {
    slug: hotel.id,
    name: hotel.name,
    location: [hotel.city, hotel.region, hotel.country].filter(Boolean).join(", "),
    type: "Hotel",
    tags,
    rating: Number.isFinite(rating) ? rating : null,
    photos: (hotel.photo_urls ?? []).filter(Boolean),
    cleaningFee: 0,
    // /api/reservations saves nights × nightly price, so the page shows that total instead of adding tax
    taxRate: 0,
    // Sold-out nights come from each room's units (lib/room-availability.ts), worked out in the browser
    blockedNights: [],
    // Stays with nights after this are looked up for their own dates (page.tsx, StayReservation)
    bookedWindow: { from, to },
    rooms,
    bookable: true,
    liteapiId: hotel.liteapi_id,
    liteapiConfigured: liveRatesEnabled(),
  };
  return { ...stay, ...stayOffers(tags, rows.map((r) => r.tags)) };
}

/** The stay with each room's live price for these dates and guests. Owner hotels come back unchanged. */
export async function withLiveRoomPrices(stay: Stay, q: StayQuery, keepOpenRoomId?: string): Promise<Stay> {
  if (!stay.liteapiId) return stay;
  const r = (await getRoomRates([stay.liteapiId], q)).get(stay.liteapiId)!;
  if (r.status === "unavailable") return { ...stay, priceSource: "stored" };
  let listed = stay.rooms;
  // A mapped hotel only sells the rooms its offers name, and a bigger party is offered other rooms than the hotel was saved with
  if (r.status === "live" && r.value.mapped) {
    const saved = new Set(stay.rooms.map((room) => room.liteapiRoomId));
    const missing = new Map(
      Object.entries(r.value.byRoom)
        .filter(([id]) => !saved.has(id))
        .map(([id, quote]): [string, number] => [id, quote.perNight]),
    );
    if (missing.size) {
      const added = await saveOfferedRooms(stay.slug, stay.liteapiId, missing);
      listed = [
        ...stay.rooms,
        ...added.filter((row) => !saved.has(row.liteapi_room_id)).map((row) => ({ ...roomOf(row), units: [{ id: row.id, bookedNights: [] }] })),
      ];
    }
  }
  const rooms = listed
    .map((room) => {
      const quote = r.status === "sold_out" ? r : quoteForRoom(r.value, { liteapiRoomId: room.liteapiRoomId ?? null, name: room.name });
      if (quote.status === "live") {
        const { rateName, perNight, refundable, cancelBy, dueAtProperty } = quote.value;
        // The rate's own room name: LiteAPI's stored room names are for reference only
        return { ...room, name: rateName || room.name, nightly: perNight, soldOut: false, refundable, cancelBy, dueAtProperty };
      }
      if (quote.status === "sold_out") return { ...room, soldOut: room.id !== keepOpenRoomId };
      return room;
    })
    // A sold-out room keeps its stored sample price, which can undercut every live one
    .sort((a, b) => Number(!!a.soldOut) - Number(!!b.soldOut) || a.nightly - b.nightly);
  return { ...stay, rooms, priceSource: "live" };
}
