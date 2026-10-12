import { changeBlocker, type Booking, type OtherStay } from "@/lib/bookings";
import { calculateTotalPrice } from "@/utils/reservation-logic";
import type { Room } from "../_data/stays";
import type { BookingToChange } from "./[id]/ChangeBooking";

// Dev-only, so the page can be checked without signing in or writing test rows to the shared database.
// Dates count from today so each section always has something in it.

function daysFrom(today: string, days: number) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getSampleBookings(today: string, empty = false): { name: string; email: string; bookings: Booking[] } {
  return {
    name: "Alex Morgan",
    email: "alex@example.com",
    bookings: empty ? [] : [
      {
        id: "48291c0e-7a3d-4f55-9b1e-2c6d8e0f4a17",
        checkIn: daysFrom(today, 2),
        checkOut: daysFrom(today, 6),
        guests: 2,
        status: "confirmed",
        hotelName: "Sunset Beach Resort",
        city: "San Diego",
        photoUrl: "https://picsum.photos/seed/sunset-1/800/600",
        roomType: "Ocean studio",
      },
      {
        id: "c41f6b2d-0e8a-4d3c-9f57-1a2b3c4d5e6f",
        checkIn: daysFrom(today, 18),
        checkOut: daysFrom(today, 21),
        guests: 1,
        status: "confirmed",
        hotelName: "Alpine Lodge",
        city: "Banff",
        photoUrl: "https://picsum.photos/seed/alpine-1/800/600",
        roomType: "Lodge king",
      },
      {
        id: "a7c2e913-5d40-4b8e-8f61-0e3b9d2c7a55",
        checkIn: daysFrom(today, -128),
        checkOut: daysFrom(today, -124),
        guests: 2,
        status: "completed",
        hotelName: "Casa del Sol",
        city: "Barcelona",
        photoUrl: "https://picsum.photos/seed/casa-1/800/600",
        roomType: "Double room",
      },
      {
        id: "e05b7f28-91c6-4a3d-b2e4-6f8a1c9d0b33",
        checkIn: daysFrom(today, -387),
        checkOut: daysFrom(today, -384),
        guests: 3,
        status: "completed",
        hotelName: "Harbour Lights Hotel",
        city: "Vancouver",
        photoUrl: "https://picsum.photos/seed/harbour-1/800/600",
        roomType: "Harbour king",
      },
      {
        id: "3d9e4a61-c8b2-4f07-a5d3-7b1e0c2f9e48",
        checkIn: daysFrom(today, 40),
        checkOut: daysFrom(today, 43),
        guests: 1,
        status: "cancelled",
        hotelName: "The Brooklyn Loft",
        city: "New York",
        photoUrl: "https://picsum.photos/seed/brooklyn-1/800/600",
        roomType: "Loft studio",
      },
    ],
  };
}

/** One sample booking for the change-booking page, with made-up rooms at its hotel */
export function getSampleBooking(id: string, today: string): { booking: BookingToChange; rooms: Room[]; otherStays: OtherStay[] } | null {
  const { bookings } = getSampleBookings(today);
  const b = bookings.find((x) => x.id === id);
  if (!b) return null;

  const rooms: Room[] = [
    { id: "standard", name: "Standard room", description: "Queen bed", sleeps: 2, nightly: 149 },
    { id: "booked", name: b.roomType ?? "Room", description: "King bed · View", sleeps: 2, nightly: 189 },
    { id: "suite", name: "Family suite", description: "2 bedrooms · Kitchenette", sleeps: 4, nightly: 289 },
  ];
  const otherStays = bookings
    .filter((x) => x.id !== id && x.status === "confirmed" && x.hotelName !== b.hotelName && x.checkOut > today)
    .map((x) => ({ checkIn: x.checkIn, checkOut: x.checkOut, hotelName: x.hotelName }));

  return {
    booking: {
      id: b.id,
      hotelName: b.hotelName,
      location: b.city ?? "",
      photoUrl: b.photoUrl,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      guests: b.guests ?? 1,
      roomId: "booked",
      total: calculateTotalPrice(b.checkIn, b.checkOut, 189),
      blocker: changeBlocker(b, today),
    },
    rooms,
    otherStays,
  };
}
