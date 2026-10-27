import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getHotel, getHotelsByOwner } from "@/utils/hotels";
import {
  type Listing,
  type ListingDraft,
  type ListingRoom,
} from "@/types/listing";
import { PROPERTY_TYPES, type PropertyType } from "@/types/listing";
import { groupRoomRows, parseBedConfiguration, planRoomChanges, type RoomRow } from "@/lib/listing-rooms";
import { amenitiesFromTags, countryFromStored, countryToStored, mergeAmenityTags } from "@/lib/listing-storage";

type HotelRow = {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  address: string;
  city: string;
  region: string | null;
  country: string | null;
  property_type?: string | null;
  postal_code?: string | null;
  photo_urls: string[] | null;
  tags: string[] | null;
};

async function getSupabase() {
  return createClient(await cookies());
}

async function getRoomsForHotel(hotelId: string) {
  const supabase = await getSupabase();

  return supabase
    .from("rooms")
    .select("*")
    .eq("hotel_id", hotelId)
    .order("created_at", { ascending: true });
}

function toListing(hotel: HotelRow, rooms: RoomRow[]): Listing {
  const tags = hotel.tags ?? [];

  return {
    id: hotel.id,
    ownerId: hotel.owner_id ?? "",
    name: hotel.name,

    propertyType: PROPERTY_TYPES.includes(hotel.property_type as PropertyType)
      ? (hotel.property_type as PropertyType)
      : "hotel",
    postalCode: hotel.postal_code ?? "",

    streetAddress: hotel.address,
    city: hotel.city,
    region: hotel.region ?? "",
    // Stored in search's spelling ("USA", "Canada"); the editor works with ISO codes
    country: countryFromStored(hotel.country),
    description: hotel.description ?? "",

    // Stored as the tags search filters on ("Free Wi-Fi"); older saves used raw ids ("wifi")
    amenities: amenitiesFromTags(tags),

    photos: (hotel.photo_urls ?? []).map((url, index) => ({
      id: `${hotel.id}-photo-${index}`,
      url,
      caption: "",
    })),

    rooms: groupRoomRows(rooms).map((g) => g.room),
  };
}

// The rooms table rejects num_beds < 1 and capacity < 1. Checking before ANY write means a bad
// room no longer leaves a half-saved listing (hotel updated, rooms deleted, insert rejected).
function checkRooms(rooms: ListingRoom[]): Error | null {
  for (const room of rooms) {
    const bed = parseBedConfiguration(room.bedConfiguration);
    if (!(bed.num_beds >= 1) || !(room.maxGuests >= 1) || !(room.nightlyRateCents > 0)) {
      return new Error(`Room "${room.roomType}" needs at least 1 bed, 1 guest and a price.`);
    }
  }
  return null;
}

// Saves the hotel details and its rooms in ONE database transaction (save_listing, audit F1/R3):
// rooms are updated in place so their bookings are kept, booked rooms are never deleted, and if
// anything fails nothing is saved (no half-saved listing). Returns the hotel id.
async function saveListing(hotelId: string | null, draft: ListingDraft, existingTags: string[]) {
  const roomError = checkRooms(draft.rooms);
  if (roomError) return { id: null, error: roomError };

  let rows: RoomRow[] = [];
  if (hotelId) {
    const current = await getRoomsForHotel(hotelId);
    if (current.error) return { id: null, error: current.error };
    rows = (current.data ?? []) as RoomRow[];
  }

  const hotel = {
    name: draft.name,
    description: draft.description,
    address: draft.streetAddress,
    city: draft.city,
    region: draft.region,
    country: countryToStored(draft.country),
    property_type: draft.propertyType,
    postal_code: draft.postalCode,
    // Keep tags the editor doesn't manage (e.g. imported "EV Charging")
    tags: mergeAmenityTags(existingTags, draft.amenities),
    photo_urls: draft.photos.map((photo) => photo.url),
  };

  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("save_listing", {
    p_hotel_id: hotelId,
    p_hotel: hotel,
    p_changes: planRoomChanges(rows, draft.rooms),
  });
  return { id: (data as string | null) ?? null, error };
}

export async function getMyListings(ownerId: string) {
  const { data, error } = await getHotelsByOwner(ownerId);

  if (error || !data) {
    return { data: null, error };
  }

  const listings = await Promise.all(
    data.map(async (hotel) => {
      const roomsResult = await getRoomsForHotel(hotel.id);

      if (roomsResult.error) {
        throw roomsResult.error;
      }

      return toListing(
        hotel as HotelRow,
        (roomsResult.data ?? []) as RoomRow[]
      );
    })
  );

  return { data: listings, error: null };
}

export async function getListing(id: string) {
  const { data, error } = await getHotel(id);

  if (error || !data) {
    return { data: null, error };
  }

  const roomsResult = await getRoomsForHotel(id);

  if (roomsResult.error) {
    return { data: null, error: roomsResult.error };
  }

  return {
    data: toListing(
      data as HotelRow,
      (roomsResult.data ?? []) as RoomRow[]
    ),
    error: null,
  };
}

export async function createListing(
  ownerId: string,
  draft: ListingDraft
) {
  // The database makes the caller the owner (save_listing uses auth.uid())
  void ownerId;
  const { id, error } = await saveListing(null, draft, []);
  if (error || !id) return { data: null, error };
  return getListing(id);
}

export async function updateListing(
  id: string,
  draft: ListingDraft
) {
  const { data: current } = await getHotel(id);
  const existingTags = ((current as HotelRow | null)?.tags ?? []) as string[];

  const { error } = await saveListing(id, draft, existingTags);
  if (error) return { data: null, error };
  return getListing(id);
}
