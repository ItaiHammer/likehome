import { notFound, redirect } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";
import { changeBlocker } from "@/lib/bookings";
import { getReservation } from "@/utils/reservations";
import { getUserId } from "@/utils/user";
import type { Stay } from "../../_data/stays";
import type { BookingToChange } from "./ChangeBooking";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReservationRow = {
  id: string;
  account_id: string;
  hotel_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  guests: number | null;
  total_price: number | string;
  status: string | null;
};

/** The signed-in guest's reservation, for the booking pages under /MyBookings/[id]. `path` is where sign-in returns to. */
export async function loadReservation(id: string, path: string) {
  const { userId } = await getUserId();
  if (!userId) redirect(`${PAGE_ROUTES.LOGIN}?next=${encodeURIComponent(path)}`);
  if (!UUID.test(id)) notFound();

  const { data, error } = await getReservation(id);
  const r = data as ReservationRow | null;
  // .single() reports "no rows" as PGRST116, which is also what another guest's booking looks like
  if (error?.code === "PGRST116" || (r && r.account_id !== userId)) notFound();
  if (error || !r) throw new Error(error?.message ?? "Couldn't load the booking");
  return { userId, reservation: r };
}

export function toBooking(r: ReservationRow, stay: Stay | null, today: string): BookingToChange {
  const status = r.status ?? "confirmed";
  return {
    id: r.id,
    hotelId: r.hotel_id,
    hotelName: stay?.name ?? "Hotel no longer listed",
    location: stay?.location ?? "",
    photoUrl: stay?.photos?.[0] ?? null,
    checkIn: r.check_in,
    checkOut: r.check_out,
    guests: r.guests ?? 1,
    roomId: r.room_id,
    total: Number(r.total_price),
    blocker: changeBlocker({ status, checkIn: r.check_in, checkOut: r.check_out }, today),
    livePrices: !!stay?.liteapiId && !!stay.liteapiConfigured,
  };
}
