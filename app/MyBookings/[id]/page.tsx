import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";
import { getOtherStays } from "@/lib/other-stays";
import { cardsForBooking, withoutStay } from "@/lib/room-availability";
import { guestToday } from "@/utils/guest-today";
import { getHotelStay } from "../../reserve/[slug]/hotelStay";
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
  // The card holding the booked room is named by it, and the booking's own nights don't count as
  // booked, so only rooms other guests hold show as unavailable (audit retest)
  const rooms = withoutStay(cardsForBooking(stay?.rooms ?? [], r.room_id), r.room_id, booking.checkIn, booking.checkOut);
  return { booking, rooms, otherStays, hotelId: r.hotel_id, bookedWindow: stay?.bookedWindow };
}

export default async function BookingPage(props: PageProps<"/MyBookings/[id]">) {
  const { id } = await props.params;
  // The guest's today (from their time zone cookie), not UTC's
  const today = await guestToday();
  // Dev only: ?sample opens the sample bookings from /MyBookings?sample, see sampleBookings.ts
  const { sample } = await props.searchParams;
  const showSample = process.env.NODE_ENV === "development" && sample !== undefined;
  const sampleData = showSample ? getSampleBooking(id, today) : null;
  const data = showSample ? sampleData && { ...sampleData, hotelId: undefined, bookedWindow: undefined } : await loadBooking(id, today);
  if (!data) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      {showSample && <SampleNotice>A sample booking, shown only on your local dev server. Changes aren’t saved.</SampleNotice>}
      <ChangeBooking
        booking={data.booking}
        rooms={data.rooms}
        otherStays={data.otherStays}
        sample={showSample}
        hotelId={data.hotelId}
        bookedWindow={data.bookedWindow}
      />
    </main>
  );
}
