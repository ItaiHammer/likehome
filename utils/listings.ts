import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  createHotel,
  getHotel,
  getHotelsByOwner,
  updateHotel,
} from "@/utils/hotels";
import {
  AMENITIES,
  type Listing,
  type ListingDraft,
  type ListingRoom,
} from "@/types/listing";

type HotelRow = {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  address: string;
  city: string;
  region: string | null;
  country: string | null;
  photo_urls: string[] | null;
  tags: string[] | null;
};

type RoomRow = {
  id: string;
  hotel_id: string;
  room_type: string;
  price_per_night: number | string;
  capacity: number | string;
  num_beds: number;
  bed_size: string | null;
  tags: string[] | null;
  created_at: string;
};

async function getSupabase() {
  return createClient(await cookies());
}

function parseBedConfiguration(text: string) {
  const match = text.trim().match(
    /^(\d+)\s+(Twin XL|Twin|Double|Queen|King)\s+bed(?:s)?$/i
  );

  if (!match) {
    return {
      num_beds: 1,
      bed_size: null as string | null,
    };
  }

  const normalizedBedSize =
    match[2].toLowerCase() === "twin xl"
      ? "Twin XL"
      : match[2].charAt(0).toUpperCase() +
        match[2].slice(1).toLowerCase();

  return {
    num_beds: Number(match[1]),
    bed_size: normalizedBedSize,
  };
}

function roomRowToListingRoom(room: RoomRow): ListingRoom {
  const price = Number(room.price_per_night);

  return {
    id: room.id,
    roomType: room.room_type,
    bedConfiguration: `${room.num_beds} ${
      room.bed_size?.toLowerCase() ?? "bed"
    } bed${room.num_beds === 1 ? "" : "s"}`,
    maxGuests: Number(room.capacity),
    roomCount: 1,
    nightlyRateCents: Math.round(price * 100),
    description: "",
  };
}

function groupRooms(rows: RoomRow[]): ListingRoom[] {
  const groups = new Map<string, ListingRoom>();

  for (const row of rows) {
    const key = [
      row.room_type,
      row.price_per_night,
      row.capacity,
      row.num_beds,
      row.bed_size ?? "",
    ].join("|");

    const existing = groups.get(key);

    if (existing) {
      existing.roomCount += 1;
    } else {
      groups.set(key, roomRowToListingRoom(row));
    }
  }

  return [...groups.values()];
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

    // Temporarily unsupported database fields.
    propertyType: "hotel",
    postalCode: "",

    streetAddress: hotel.address,
    city: hotel.city,
    region: hotel.region ?? "",
    country: hotel.country ?? "",
    description: hotel.description ?? "",

    amenities: AMENITIES.filter((amenity) => tags.includes(amenity)),

    photos: (hotel.photo_urls ?? []).map((url, index) => ({
      id: `${hotel.id}-photo-${index}`,
      url,
      caption: "",
    })),

    rooms: groupRooms(rooms),
  };
}

function draftRoomToRows(hotelId: string, room: ListingRoom) {
  const bed = parseBedConfiguration(room.bedConfiguration);
  const count = Math.max(1, room.roomCount);

  return Array.from({ length: count }, () => ({
    hotel_id: hotelId,
    room_type: room.roomType,
    price_per_night: room.nightlyRateCents / 100,
    capacity: room.maxGuests,
    num_beds: bed.num_beds,
    bed_size: bed.bed_size,
    tags: [],
  }));
}

async function replaceRooms(hotelId: string, rooms: ListingRoom[]) {
  const supabase = await getSupabase();

  const { error: deleteError } = await supabase
    .from("rooms")
    .delete()
    .eq("hotel_id", hotelId);

  if (deleteError) return { error: deleteError };

  const rows = rooms.flatMap((room) => draftRoomToRows(hotelId, room));

  if (rows.length === 0) return { error: null };

  const { error: insertError } = await supabase
    .from("rooms")
    .insert(rows);

  return { error: insertError };
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
  const { data, error } = await createHotel({
    owner_id: ownerId,
    name: draft.name,
    description: draft.description,
    address: draft.streetAddress,
    city: draft.city,
    region: draft.region,
    country: draft.country,
    tags: draft.amenities,
    photo_urls: draft.photos.map((photo) => photo.url),
  });

  const hotel = Array.isArray(data) ? data[0] : data;

  if (error || !hotel) {
    return { data: null, error };
  }

  const roomsResult = await replaceRooms(hotel.id, draft.rooms);

  if (roomsResult.error) {
    return { data: null, error: roomsResult.error };
  }

  return getListing(hotel.id);
}

export async function updateListing(
  id: string,
  draft: ListingDraft
) {
  const { data, error } = await updateHotel(id, {
    name: draft.name,
    description: draft.description,
    address: draft.streetAddress,
    city: draft.city,
    region: draft.region,
    country: draft.country,
    tags: draft.amenities,
    photo_urls: draft.photos.map((photo) => photo.url),
  });

  const hotel = Array.isArray(data) ? data[0] : data;

  if (error || !hotel) {
    return { data: null, error };
  }

  const roomsResult = await replaceRooms(id, draft.rooms);

  if (roomsResult.error) {
    return { data: null, error: roomsResult.error };
  }

  return getListing(id);
}