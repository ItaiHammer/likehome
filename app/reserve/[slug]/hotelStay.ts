import { getHotel } from "@/utils/hotels";
import { getRoomsByHotel } from "@/utils/rooms";
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
};

function bedLabel(count: number, size: string | null) {
  const kind = size ? `${size.toLowerCase().replace("xl", "XL")} bed` : "bed";
  return `${count} ${kind}${count === 1 ? "" : "s"}`;
}

/** A database hotel and its rooms, shaped like the sample stays so the same page can show it. */
export async function getHotelStay(id: string): Promise<Stay | null> {
  // Anything that isn't a hotel id would only make the database query fail
  if (!UUID.test(id)) return null;

  const [hotelResult, roomsResult] = await Promise.all([getHotel(id), getRoomsByHotel(id)]);
  const hotel = hotelResult.data as HotelRow | null;
  const rows = (roomsResult.data ?? []) as RoomRow[];
  if (!hotel || rows.length === 0) return null;

  const rooms: Room[] = rows
    .map((r) => ({
      id: r.id,
      name: r.room_type,
      description: bedLabel(r.num_beds ?? 1, r.bed_size),
      sleeps: r.capacity ?? 2,
      nightly: Number(r.price_per_night),
    }))
    .sort((a, b) => a.nightly - b.nightly);

  const rating = hotel.rating === null ? null : Number(hotel.rating);

  return {
    slug: hotel.id,
    name: hotel.name,
    location: [hotel.city, hotel.region, hotel.country].filter(Boolean).join(", "),
    type: "Hotel",
    tags: hotel.tags ?? [],
    rating: Number.isFinite(rating) ? rating : null,
    photos: (hotel.photo_urls ?? []).filter(Boolean),
    cleaningFee: 0,
    // No booked-dates lookup exists yet, so every night shows as open
    blockedNights: [],
    rooms,
  };
}
