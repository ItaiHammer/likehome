import { getHotel } from "@/utils/hotels";
import { getRoomsByHotel } from "@/utils/rooms";
import { roomAmenityList, stayOffers } from "@/lib/stay-filters";
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

  const rooms: Room[] = rows
    .map((r) => ({
      id: r.id,
      name: r.room_type,
      // The room's own amenities, the same tags search filters on
      description: [bedLabel(r.num_beds, r.bed_size), ...roomAmenityList(r.tags)].filter(Boolean).join(" · "),
      sleeps: r.capacity ?? 2,
      nightly: Number(r.price_per_night),
      beds: r.num_beds ?? 1,
      bedSize: r.bed_size,
      tags: r.tags ?? [],
    }))
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
    // No booked-dates lookup exists yet, so every night shows as open
    blockedNights: [],
    rooms,
    bookable: true,
  };
  return { ...stay, ...stayOffers(tags, rows.map((r) => r.tags)) };
}
