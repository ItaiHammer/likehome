import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";
import { partyOf } from "@/lib/liteapi/party";
import { getOtherStays } from "@/lib/other-stays";
import { todayUTC } from "@/utils/reservation-logic";
import { getHotelStay, withLiveRoomPrices } from "../../reserve/[slug]/hotelStay";
import { SampleNotice } from "../_components/SampleNotice";
import { getSampleBooking } from "../sampleBookings";
import { loadReservation, toBooking } from "./booking";
import { ChangeBooking } from "./ChangeBooking";

export const metadata: Metadata = { title: "Your booking — LikeHome" };

// Read per request with the sign-in cookie, which a prerendered page can't do (see the stay page)
export const dynamic = "force-dynamic";

async function loadBooking(id: string, today: string) {
  const { userId, reservation: r } = await loadReservation(id, `${PAGE_ROUTES.MY_BOOKINGS}/${id}`);
  const [stay, otherStays] = await Promise.all([getHotelStay(r.hotel_id), getOtherStays(userId, r.hotel_id, r.id)]);
  const booking = toBooking(r, stay, today);
  let rooms = stay?.rooms ?? [];
  if (!booking.blocker && stay?.liteapiId) {
    // The guest's own room stays selectable even when LiteAPI has no more of it for these dates
    const party = partyOf(booking.guests - booking.children, booking.children);
    rooms = (await withLiveRoomPrices(stay, { checkIn: r.check_in, checkOut: r.check_out, ...party }, r.room_id)).rooms;
  }
  return { booking, rooms, otherStays };
}

export default async function BookingPage(props: PageProps<"/MyBookings/[id]">) {
  const { id } = await props.params;
  const today = todayUTC();
  // Dev only: ?sample opens the sample bookings from /MyBookings?sample, see sampleBookings.ts
  const { sample } = await props.searchParams;
  const showSample = process.env.NODE_ENV === "development" && sample !== undefined;
  const data = showSample ? getSampleBooking(id, today) : await loadBooking(id, today);
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      {showSample && <SampleNotice>A sample booking, shown only on your local dev server. Changes aren’t saved.</SampleNotice>}
      <ChangeBooking booking={data.booking} rooms={data.rooms} otherStays={data.otherStays} sample={showSample} />
    </main>
  );
}
