import type { Room } from "../../_data/stays";

// Display labels only. Room IDs, descriptions, availability and prices remain unchanged.
export function displayRoomName(name: string): string {
  const clean = name.replace(/\s*\(\s*No Resort Fees?\s*\)/gi, "").trim();
  // LiteAPI combines the room type with comma-separated attributes. Beds, accessibility,
  // smoking policy and fixtures are not part of the short room-type heading.
  return clean.split(/\s*,\s*/)[0]?.trim() || clean;
}

// Equivalent vendor rate rows need one selectable card, not duplicate-looking cards.
// Do not combine different accessibility, pricing, occupancy, cancellation or fees.
export function displayRoomOptions(rooms: Room[], selectedId: string): Room[] {
  const byKey = new Map<string, Room>();
  for (const room of rooms) {
    const key = JSON.stringify([
      room.name.trim().toLowerCase().replace(/\s*\(\s*no resort fees?\s*\)/g, ""),
      room.beds ?? null, room.bedSize ?? null, room.sleeps, room.maxAdults ?? null,
      room.maxChildren ?? null, room.nightly, room.refundable ?? null,
      room.cancelBy ?? null, room.dueAtProperty ?? null, room.soldOut ?? false,
      room.bookedForDates ?? false,
      // Keep vendor's differently accessible room offerings distinct.
      room.tags?.filter((tag) => /access|wheelchair|mobility|hearing/i.test(tag)).sort() ?? [],
    ]);
    const prior = byKey.get(key);
    if (!prior || room.id === selectedId) byKey.set(key, room);
  }
  return [...byKey.values()];
}
