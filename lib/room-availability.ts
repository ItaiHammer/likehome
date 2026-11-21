// No Supabase / Next.js imports here so it can be unit tested with `npm test`.
// Audit F9: which rooms are free for a stay. A database hotel can have several identical rooms
// (3 × "Coastal king"); the stay page shows them as one card, and booking picks whichever of them
// is free for the guest's nights. Nights are YYYY-MM-DD; a stay covers check-in up to, not
// including, check-out (the check-out day is free for the next guest).

import { addDays, nightsBetween } from '../app/_components/dates.ts';
import { roomFits } from './stay-filters.ts';

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

/**
 * The rooms without the guest's own stay counted as booked, for changing a booking: the room they
 * already hold is free for its own nights (audit retest: My Bookings room switch).
 */
export function withoutStay<R extends WithUnits>(rooms: R[], unitId: string, checkIn: string, checkOut: string): R[] {
  const inStay = coversNight(checkIn, checkOut);
  return rooms.map((r) =>
    r.units?.some((u) => u.id === unitId)
      ? { ...r, units: r.units.map((u) => (u.id === unitId ? { ...u, bookedNights: u.bookedNights.filter((n) => !inStay(n)) } : u)) }
      : r,
  );
}

/**
 * The room cards for a booking being changed: the card holding the booked room is named by that
 * room's id and offers it first, so keeping the same room keeps the same room.
 */
export function cardsForBooking<R extends WithUnits>(rooms: R[], unitId: string): R[] {
  return rooms.map((r) => {
    const own = r.units?.find((u) => u.id === unitId);
    return own && r.units ? { ...r, id: unitId, units: [own, ...r.units.filter((u) => u !== own)] } : r;
  });
}

/**
 * Nights (from `from` on) the calendar crosses out: every room that fits the party is booked, or the
 * guest is staying at another hotel. A night only the chosen room has taken stays open, so picking it
 * moves the guest to a free room. Pass no rooms when more may turn up (LiteAPI hotels).
 */
export function blockedNights(fittingRooms: WithUnits[], otherStays: { checkIn: string; checkOut: string }[], from: string): string[] {
  const nights = new Set(fittingRooms.length ? soldOutNights(fittingRooms) : []);
  for (const stay of otherStays) {
    for (let night = stay.checkIn; night < stay.checkOut; night = addDays(night, 1)) nights.add(night);
  }
  return [...nights].filter((night) => night >= from).sort();
}

/**
 * The calendar's crossed-out nights as days from `today`, for the rooms that fit the party.
 * `today` is "" while rendering on the server, which gives none.
 */
export function blockedOffsets(
  rooms: (WithUnits & Parameters<typeof roomFits>[0])[],
  party: { adults: number; children: number },
  otherStays: { checkIn: string; checkOut: string }[],
  today: string,
  { moreRoomsMayAppear = false }: { moreRoomsMayAppear?: boolean } = {},
): number[] {
  if (!today) return [];
  const { adults, children } = party;
  const fitting = moreRoomsMayAppear ? [] : rooms.filter((r) => roomFits(r, adults + children, adults, children));
  return blockedNights(fitting, otherStays, today).map((night) => nightsBetween(today, night));
}

export const BLOCKED_NOTE = 'Struck-through dates have no room free for your party, or overlap another stay of yours.';

/** Why the chosen room can't be booked for the chosen dates, or null when it can. */
export function roomProblem(room: { name: string; soldOut?: boolean; bookedForDates?: boolean }): string | null {
  if (room.bookedForDates) return `${room.name} is booked for those dates. Pick another room or change your dates.`;
  if (room.soldOut) return `${room.name} is sold out. Pick another room.`;
  return null;
}

/**
 * True when get_booked_nights rows show the room taken on a night of the stay. `own` is the booking
 * being changed, whose nights in its own room don't count against it.
 */
export function roomTaken(
  rows: { room_id: string; night: string }[],
  roomId: string,
  checkIn: string,
  checkOut: string,
  own?: { roomId: string; checkIn: string; checkOut: string },
): boolean {
  const inStay = coversNight(checkIn, checkOut);
  const mine = own && own.roomId === roomId ? coversNight(own.checkIn, own.checkOut) : () => false;
  return (nightsByRoom(rows).get(roomId) ?? []).some((night) => inStay(night) && !mine(night));
}
