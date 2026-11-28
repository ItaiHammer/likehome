import type { Room } from "../../_data/stays";

// Display labels only. Room IDs, descriptions, availability and prices remain unchanged.
// Full name is important in booking summaries: view and accessibility can be after commas.
export function displayRoomName(name: string): string {
  return name.replace(/\s*\(\s*No Resort Fees?\s*\)/gi, "").trim();
}

// Room cards put the room type on the first line and every vendor detail below it.
export function displayRoomType(name: string): string {
  const full = displayRoomName(name);
  return full.split(/\s*,\s*/)[0]?.trim() || full;
}

export function displayRoomDetails(name: string): string {
  const full = displayRoomName(name);
  const comma = full.indexOf(",");
  return comma < 0 ? "" : full.slice(comma + 1).trim();
}

// Equivalent vendor rate rows need one selectable card, not duplicate-looking cards.
// Do not combine different amenities, accessibility, pricing, occupancy, cancellation or fees.
export function displayRoomOptions(rooms: Room[], selectedId: string): Room[] {
  const byKey = new Map<string, Room>();
  for (const room of rooms) {
    const key = JSON.stringify([
      room.name.trim().toLowerCase().replace(/\s*\(\s*no resort fees?\s*\)/g, ""),
      room.beds ?? null, room.bedSize ?? null, room.sleeps, room.maxAdults ?? null,
      room.maxChildren ?? null, room.nightly, room.refundable ?? null,
      room.cancelBy ?? null, room.dueAtProperty ?? null, room.soldOut ?? false,
      room.bookedForDates ?? false,
      // Rooms with different amenities must remain separate even if their names and prices match.
      [...(room.tags ?? [])].sort(),
    ]);
    const prior = byKey.get(key);
    if (!prior || room.id === selectedId) byKey.set(key, room);
  }
  return [...byKey.values()];
}
