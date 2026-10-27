import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  createHotel,
  getHotel,
  getHotelsByOwner,
  updateHotel,
} from "@/utils/hotels";
import {
  type Listing,
  type ListingDraft,
  type ListingRoom,
} from "@/types/listing";
import { PROPERTY_TYPES, type PropertyType } from "@/types/listing";
import { groupRoomRows, hasRoomChanges, parseBedConfiguration, planRoomChanges, type RoomRow } from "@/lib/listing-rooms";
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

// Saves the editor's rooms in place (audit F1): rooms keep their ids, so their bookings are kept.
// Rooms with bookings are never deleted; save_listing_rooms refuses the save instead.
async function saveRooms(hotelId: string, rooms: ListingRoom[]) {
  // Re-checked here as a last guard (create/update check first, before touching the hotel)
  const roomError = checkRooms(rooms);
  if (roomError) return { error: roomError };

  const current = await getRoomsForHotel(hotelId);
  if (current.error) return { error: current.error };

  const changes = planRoomChanges((current.data ?? []) as RoomRow[], rooms);
  if (!hasRoomChanges(changes)) return { error: null };

  const supabase = await getSupabase();
  const { error } = await supabase.rpc("save_listing_rooms", { p_hotel_id: hotelId, p_changes: changes });
  return { error };
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
  const roomError = checkRooms(draft.rooms);
  if (roomError) return { data: null, error: roomError };

  const { data, error } = await createHotel({
    owner_id: ownerId,
    name: draft.name,
    description: draft.description,
    address: draft.streetAddress,
    city: draft.city,
    region: draft.region,
    country: countryToStored(draft.country),
    property_type: draft.propertyType,
    postal_code: draft.postalCode,
    tags: mergeAmenityTags([], draft.amenities),
    photo_urls: draft.photos.map((photo) => photo.url),
  });

  const hotel = Array.isArray(data) ? data[0] : data;

  if (error || !hotel) {
    return { data: null, error };
  }

  const roomsResult = await saveRooms(hotel.id, draft.rooms);

  if (roomsResult.error) {
    return { data: null, error: roomsResult.error };
  }

  return getListing(hotel.id);
}

export async function updateListing(
  id: string,
  draft: ListingDraft
) {
  const roomError = checkRooms(draft.rooms);
  if (roomError) return { data: null, error: roomError };

  // Keep tags the editor doesn't manage (e.g. imported "EV Charging") when saving amenities
  const { data: current } = await getHotel(id);
  const existingTags = ((current as HotelRow | null)?.tags ?? []) as string[];

  const { data, error } = await updateHotel(id, {
    name: draft.name,
    description: draft.description,
    address: draft.streetAddress,
    city: draft.city,
    region: draft.region,
    country: countryToStored(draft.country),
    property_type: draft.propertyType,
    postal_code: draft.postalCode,
    tags: mergeAmenityTags(existingTags, draft.amenities),
    photo_urls: draft.photos.map((photo) => photo.url),
  });

  const hotel = Array.isArray(data) ? data[0] : data;

  if (error || !hotel) {
    return { data: null, error };
  }

  const roomsResult = await saveRooms(id, draft.rooms);

  if (roomsResult.error) {
    return { data: null, error: roomsResult.error };
  }

  return getListing(id);
}