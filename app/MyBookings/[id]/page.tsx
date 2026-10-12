import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PAGE_ROUTES } from "@/constants/routes";
import { getOtherStays } from "@/lib/other-stays";
import { todayUTC } from "@/utils/reservation-logic";
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
  return { booking: toBooking(r, stay, today), rooms: stay?.rooms ?? [], otherStays };
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
