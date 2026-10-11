import { getHotel } from "@/utils/hotels";
import { getRoomsByHotel } from "@/utils/rooms";
import { getFacts, type FactGroup } from "../../_data/facts";
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

// num_beds defaults to 1 in the database, so without a bed size the count was never filled in
function bedLabel(count: number | null, size: string | null) {
  if (!size) return "";
  const n = count ?? 1;
  return `${n} ${size.toLowerCase().replace("xl", "XL")} bed${n === 1 ? "" : "s"}`;
}

// The placeholder facts, with the parts the hotel's tags answer (the same tags search filters on)
// taken from the tags, so a hotel found by "Pets" doesn't say pets aren't allowed.
function hotelFacts(stay: Stay, tags: string[]): FactGroup[] {
  const has = (tag: string) => tags.includes(tag);
  const offered = (tag: string, value: string) => (has(tag) ? value : "Not available");

  return getFacts(stay).map((group) => {
    switch (group.id) {
      case "amenities":
        return {
          ...group,
          items: [
            { label: "Wi-Fi", value: offered("Free Wi-Fi", "Free") },
            { label: "Kitchen", value: offered("Kitchen", "Yes") },
            { label: "Washer and dryer", value: offered("Washer & Dryer", "On site") },
            { label: "Pool", value: offered("Pool", "On site") },
            { label: "Gym", value: offered("Gym", "On site") },
            { label: "Meals", value: offered("Free Meals", "Included") },
            { label: "Housekeeping", value: offered("Housekeeping", "Included") },
          ],
        };
      case "parking":
        return {
          ...group,
          items: [
            { label: "Parking", value: offered("Parking", "On site") },
            { label: "EV charging", value: offered("EV Charging", "Available") },
            { label: "Directions", value: "Sent with your confirmation" },
          ],
        };
      case "pets":
        return {
          ...group,
          items: [
            { label: "Pets", value: has("Pets") ? "Allowed" : "Not allowed" },
            { label: "Service animals", value: "Always welcome" },
          ],
        };
      case "accessibility":
        return {
          ...group,
          items: [
            { label: "Accessible (ADA) rooms", value: has("ADA Compliant") ? "Yes" : "Not listed" },
            { label: "Ground-floor room", value: "Ask when you book" },
          ],
        };
      default:
        return group;
    }
  });
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
      description: bedLabel(r.num_beds, r.bed_size),
      sleeps: r.capacity ?? 2,
      nightly: Number(r.price_per_night),
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
  return { ...stay, facts: hotelFacts(stay, tags) };
}
