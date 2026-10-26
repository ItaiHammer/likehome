import { getHotel } from "@/utils/hotels";
import { getRoomsByHotel } from "@/utils/rooms";
import { roomAmenityList, stayOffers } from "@/lib/stay-filters";
import { nightsByRoom } from "@/lib/room-availability";
import { addDays } from "../../_components/dates";
import { todayUTC } from "@/utils/reservation-logic";
import { getBookedNights } from "@/utils/rooms";
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
};

// num_beds defaults to 1 in the database, so without a bed size the count was never filled in
function bedLabel(count: number | null, size: string | null) {
  if (!size) return "";
  const n = count ?? 1;
  return `${n} ${size.toLowerCase().replace("xl", "XL")} bed${n === 1 ? "" : "s"}`;
}

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
  const booked = await getBookedNights(id, from, addDays(from, 400));
  if (booked.error) console.error("get_booked_nights failed:", booked.error.message);
  const bookedNights = nightsByRoom(booked.data ?? []);

  // Identical rooms (same type, price, beds, limits and amenities) show as one card. Booking picks
  // whichever of them is free for the guest's dates; the card's id is the first one's.
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
    ]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const rooms: Room[] = [...groups.values()]
    .map((units) => {
      const r = units[0];
      return {
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
        units: units.map((u) => ({ id: u.id, bookedNights: bookedNights.get(u.id) ?? [] })),
      };
    })
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
    rooms,
    bookable: true,
  };
  return { ...stay, ...stayOffers(tags, rows.map((r) => r.tags)) };
}
