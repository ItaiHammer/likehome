// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// The listing editor shows rooms grouped by type ("3 × Coastal king"), but the rooms table has one row
// per physical room, and bookings point at those rows. Saving used to delete every row and insert new
// ones, which deleted every booking with them (audit F1). planRoomChanges works out what actually
// changed so the database can update rooms in place (save_listing).
import type { ListingRoom } from "../types/listing.ts";

export type RoomRow = {
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

export type RoomFields = {
  room_type: string;
  price_per_night: number;
  capacity: number;
  num_beds: number;
  bed_size: string | null;
};

export type RoomChanges = {
  update: (RoomFields & { ids: string[] })[];
  remove: { ids: string[]; count: number; room_type: string }[];
  insert: RoomFields[];
};

export function parseBedConfiguration(text: string) {
  const match = text.trim().match(/^(\d+)\s+(Twin XL|Twin|Double|Queen|King)\s+bed(?:s)?$/i);

  if (!match) {
    return { num_beds: 1, bed_size: null as string | null };
  }

  const normalizedBedSize =
    match[2].toLowerCase() === "twin xl"
      ? "Twin XL"
      : match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();

  return { num_beds: Number(match[1]), bed_size: normalizedBedSize };
}

function rowToListingRoom(room: RoomRow): ListingRoom {
  return {
    id: room.id,
    roomType: room.room_type,
    bedConfiguration: `${room.num_beds} ${room.bed_size?.toLowerCase() ?? "bed"} bed${room.num_beds === 1 ? "" : "s"}`,
    maxGuests: Number(room.capacity),
    roomCount: 1,
    nightlyRateCents: Math.round(Number(room.price_per_night) * 100),
    description: "",
  };
}

const groupKey = (row: RoomRow) =>
  [row.room_type, Number(row.price_per_night), Number(row.capacity), row.num_beds, row.bed_size ?? ""].join("|");

/**
 * Identical rows become one editor room type. Each group's id is its first row's id (rows come
 * ordered by created_at), so the same rows always give the same ids, on load and again on save.
 */
export function groupRoomRows(rows: RoomRow[]): { room: ListingRoom; ids: string[] }[] {
  const groups = new Map<string, { room: ListingRoom; ids: string[] }>();
  for (const row of rows) {
    const key = groupKey(row);
    const existing = groups.get(key);
    if (existing) {
      existing.room.roomCount += 1;
      existing.ids.push(row.id);
    } else {
      groups.set(key, { room: rowToListingRoom(row), ids: [row.id] });
    }
  }
  return [...groups.values()];
}

export function roomFields(room: ListingRoom): RoomFields {
  const bed = parseBedConfiguration(room.bedConfiguration);
  return {
    room_type: room.roomType,
    price_per_night: room.nightlyRateCents / 100,
    capacity: room.maxGuests,
    num_beds: bed.num_beds,
    bed_size: bed.bed_size,
  };
}

const sameFields = (a: RoomFields, b: RoomFields) =>
  a.room_type === b.room_type &&
  a.price_per_night === b.price_per_night &&
  a.capacity === b.capacity &&
  a.num_beds === b.num_beds &&
  a.bed_size === b.bed_size;

/**
 * What saving `draft` changes, given the rows in the database now.
 * - A draft room whose id is an existing group's id edits that group: its rows are updated in place,
 *   extra rooms are added, and fewer rooms removes the difference (the database picks unbooked ones).
 * - A draft room with any other id (the editor gives new rooms a random id) adds new rooms.
 * - A group missing from the draft is removed entirely (refused by the database if any are booked).
 */
export function planRoomChanges(rows: RoomRow[], draft: ListingRoom[]): RoomChanges {
  const groups = new Map(groupRoomRows(rows).map((g) => [g.room.id, g]));
  const changes: RoomChanges = { update: [], remove: [], insert: [] };
  const kept = new Set<string>();

  for (const room of draft) {
    const fields = roomFields(room);
    const count = Math.max(1, Math.floor(room.roomCount));
    const group = groups.get(room.id);

    if (!group || kept.has(room.id)) {
      for (let i = 0; i < count; i++) changes.insert.push(fields);
      continue;
    }
    kept.add(room.id);

    if (!sameFields(fields, roomFields(group.room))) {
      changes.update.push({ ...fields, ids: group.ids });
    }
    if (count > group.ids.length) {
      for (let i = group.ids.length; i < count; i++) changes.insert.push(fields);
    } else if (count < group.ids.length) {
      changes.remove.push({ ids: group.ids, count: group.ids.length - count, room_type: fields.room_type });
    }
  }

  for (const [id, group] of groups) {
    if (!kept.has(id)) {
      changes.remove.push({ ids: group.ids, count: group.ids.length, room_type: group.room.roomType });
    }
  }

  return changes;
}

export const hasRoomChanges = (c: RoomChanges) => c.update.length + c.remove.length + c.insert.length > 0;
