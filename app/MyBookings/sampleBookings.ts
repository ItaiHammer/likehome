import type { Booking } from "@/lib/bookings";

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
