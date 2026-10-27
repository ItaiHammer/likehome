// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// Audit F9: which rooms are free for a stay. A database hotel can have several identical rooms
// (3 × "Coastal king"); the stay page shows them as one card, and booking picks whichever of them
// is free for the guest's nights. Nights are YYYY-MM-DD; a stay covers check-in up to, not
// including, check-out (the check-out day is free for the next guest).

export type RoomUnit = { id: string; bookedNights: string[] };
type WithUnits = { id: string; units?: RoomUnit[] };

const coversNight = (checkIn: string, checkOut: string) => (night: string) => night >= checkIn && night < checkOut;

/**
 * The room id to book for these dates: the first identical room that's free every night, or null
 * if they're all booked. Rooms without unit details (the sample stays) are always their own id.
 */
export function freeUnitId(room: WithUnits, checkIn: string, checkOut: string): string | null {
  if (!room.units || room.units.length === 0) return room.id;
  if (!checkIn || !checkOut || checkOut <= checkIn) return room.units[0].id;
  const inStay = coversNight(checkIn, checkOut);
  return room.units.find((unit) => !unit.bookedNights.some(inStay))?.id ?? null;
}

/** Nights when every room at the hotel is booked, so the calendar can cross them out. */
export function soldOutNights(rooms: WithUnits[]): string[] {
  const units = rooms.flatMap((room) => room.units ?? []);
  // Without unit details for every room, nothing is known to be sold out
  if (units.length === 0 || rooms.some((room) => !room.units || room.units.length === 0)) return [];
  const [first, ...rest] = units;
  return [...new Set(first.bookedNights)].filter((night) => rest.every((unit) => unit.bookedNights.includes(night))).sort();
}

/** Booked nights per room id, from get_booked_nights rows ({ room_id, night }). */
export function nightsByRoom(rows: { room_id: string; night: string }[]): Map<string, string[]> {
  const byRoom = new Map<string, string[]>();
  for (const row of rows) {
    const night = String(row.night).slice(0, 10);
    const list = byRoom.get(row.room_id);
    if (list) list.push(night);
    else byRoom.set(row.room_id, [night]);
  }
  return byRoom;
}

/**
 * The rooms with every card that's fully booked for these dates marked sold out (bookedForDates),
 * so pickers and "cheapest open room" choices skip it (audit R5). Without dates nothing changes.
 */
export function markBookedRooms<R extends WithUnits & { soldOut?: boolean; bookedForDates?: boolean }>(
  rooms: R[],
  checkIn: string,
  checkOut: string,
): R[] {
  if (!checkIn || !checkOut || checkOut <= checkIn) return rooms;
  return rooms.map((r) => (!r.soldOut && freeUnitId(r, checkIn, checkOut) === null ? { ...r, soldOut: true, bookedForDates: true } : r));
}

/** The nights already looked up for a stay page: from (inclusive) up to to (exclusive). */
export type BookedWindow = { from: string; to: string };

/**
 * True when a stay has nights outside the window already looked up, so they must be looked up
 * for those exact dates before saying a room is free (stays can be booked further ahead than the
 * page's first lookup covers).
 */
export function outsideWindow(window: BookedWindow | undefined, checkIn: string, checkOut: string): boolean {
  if (!window || !checkIn || !checkOut || checkOut <= checkIn) return false;
  return checkIn < window.from || checkOut > window.to;
}

/** The rooms with extra booked nights (get_booked_nights rows) added to their units. */
export function mergeBookedNights<R extends WithUnits>(rooms: R[], rows: { room_id: string; night: string }[]): R[] {
  if (rows.length === 0) return rooms;
  const extra = nightsByRoom(rows);
  return rooms.map((r) =>
    r.units
      ? {
          ...r,
          units: r.units.map((u) => {
            const more = extra.get(u.id);
            return more ? { ...u, bookedNights: [...new Set([...u.bookedNights, ...more])].sort() } : u;
          }),
        }
      : r,
  );
}
