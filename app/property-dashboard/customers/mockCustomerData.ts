import type {HotelBooking, HotelCustomer, HotelCustomerHistory} from "../../../lib/hotel-customers.ts";
import {summarizeOwner} from "../../../lib/hotel-customers.ts";

// Completely fictional data for local UI testing. Never written to Supabase.
const bookings: HotelBooking[] = [
    {
        id: "mock-reservation-1", code: "LH-11220", hotelId: "mock-harbor-house", hotelName: "Harbor House",
        roomType: "Coastal king", guestId: "mock-sarah", guestName: "Sarah Chen", guestEmail: "sarah@example.com",
        checkIn: "2026-12-20", checkOut: "2026-12-23", nights: 3, guests: 2, children: 0,
        stage: "upcoming", totalPrice: 567, amountPaid: 567, amountRefunded: 0,
        cancellationFee: null, hasInsurance: false, bookedAt: "2026-11-14", cancelledAt: null,
    },
    {
        id: "mock-reservation-2", code: "LH-11112", hotelId: "mock-harbor-house", hotelName: "Harbor House",
        roomType: "Coastal king", guestId: "mock-sarah", guestName: "Sarah Chen", guestEmail: "sarah@example.com",
        checkIn: "2026-11-12", checkOut: "2026-11-15", nights: 3, guests: 2, children: 0,
        stage: "cancelled",
        totalPrice: 567,
        amountPaid: 567,
        amountRefunded: 567,
        cancellationFee: 0,
        hasInsurance: true, bookedAt: "2026-10-30", cancelledAt: "2026-11-06",
    },
    {
        id: "mock-reservation-3", code: "LH-11042", hotelId: "mock-harbor-house", hotelName: "Harbor House",
        roomType: "Coastal king", guestId: "mock-sarah", guestName: "Sarah Chen", guestEmail: "sarah@example.com",
        checkIn: "2026-11-02", checkOut: "2026-11-05", nights: 3, guests: 2, children: 0,
        stage: "past", totalPrice: 567, amountPaid: 567, amountRefunded: 0,
        cancellationFee: null, hasInsurance: false, bookedAt: "2026-10-13", cancelledAt: null,
    },
    {
        id: "mock-reservation-4", code: "LH-10510", hotelId: "mock-harbor-house", hotelName: "Harbor House",
        roomType: "Coastal king", guestId: "mock-sarah", guestName: "Sarah Chen", guestEmail: "sarah@example.com",
        checkIn: "2026-05-10", checkOut: "2026-05-12", nights: 2, guests: 2, children: 0,
        stage: "past", totalPrice: 378, amountPaid: 378, amountRefunded: 0,
        cancellationFee: null, hasInsurance: false, bookedAt: "2026-04-20", cancelledAt: null,
    },
    {
        id: "mock-reservation-5", code: "LH-11350", hotelId: "mock-pacific-terrace", hotelName: "Pacific Terrace",
        roomType: "Ocean queen", guestId: "mock-maya", guestName: "Maya Patel", guestEmail: "maya@example.com",
        checkIn: "2026-12-05", checkOut: "2026-12-08", nights: 3, guests: 1, children: 0,
        stage: "upcoming", totalPrice: 615, amountPaid: 615, amountRefunded: 0,
        cancellationFee: null, hasInsurance: false, bookedAt: "2026-11-12", cancelledAt: null,
    },
    {
        id: "mock-reservation-6", code: "LH-10610", hotelId: "mock-pacific-terrace", hotelName: "Pacific Terrace",
        roomType: "Ocean queen", guestId: "mock-maya", guestName: "Maya Patel", guestEmail: "maya@example.com",
        checkIn: "2026-06-10", checkOut: "2026-06-12", nights: 2, guests: 1, children: 0,
        stage: "past", totalPrice: 410, amountPaid: 410, amountRefunded: 0,
        cancellationFee: null, hasInsurance: false, bookedAt: "2026-05-25", cancelledAt: null,
    },
    {
        id: "mock-reservation-7", code: "LH-10814", hotelId: "mock-harbor-house", hotelName: "Harbor House",
        roomType: "Garden twin", guestId: "mock-daniel", guestName: "Daniel Rivera", guestEmail: "daniel@example.com",
        checkIn: "2026-08-14", checkOut: "2026-08-16", nights: 2, guests: 2, children: 0,
        stage: "past", totalPrice: 320, amountPaid: 320, amountRefunded: 0,
        cancellationFee: null, hasInsurance: false, bookedAt: "2026-07-30", cancelledAt: null,
    },
];

const customers: HotelCustomer[] = [
    {
        id: "mock-sarah", name: "Sarah Chen", email: "sarah@example.com", bookings: 4,
        cancelled: 1, upcoming: 1, nightsStayed: 5, totalSpent: 1572,
        firstStay: "2026-05-10", lastStay: "2026-11-02", nextStay: "2026-12-20",
        isRepeat: true, listings: ["Harbor House"],
    },
    {
        id: "mock-maya", name: "Maya Patel", email: "maya@example.com", bookings: 2,
        cancelled: 0, upcoming: 1, nightsStayed: 2, totalSpent: 1025,
        firstStay: "2026-06-10", lastStay: "2026-06-10", nextStay: "2026-12-05",
        isRepeat: true, listings: ["Pacific Terrace"],
    },
    {
        id: "mock-daniel", name: "Daniel Rivera", email: "daniel@example.com", bookings: 1,
        cancelled: 0, upcoming: 0, nightsStayed: 2, totalSpent: 320,
        firstStay: "2026-08-14", lastStay: "2026-08-14", nextStay: null,
        isRepeat: false, listings: ["Harbor House"],
    },
];

export const mockCustomerData: HotelCustomerHistory = {
    listings: [
        {id: "mock-harbor-house", name: "Harbor House"},
        {id: "mock-pacific-terrace", name: "Pacific Terrace"},
    ],
    summary: {
        customers: 3, repeatCustomers: 2, bookings: 7, upcoming: 2, cancelled: 1,
        revenue: 2917,
    },
    customers,
    bookings,
};

/** Apply the demo property picker without involving the real API. */
export function filterMockCustomerData(hotelId: string): HotelCustomerHistory {
    if (!hotelId) return mockCustomerData;

    const filteredBookings = bookings.filter((booking) => booking.hotelId === hotelId);
    const guestIds = new Set(filteredBookings.map((booking) => booking.guestId));
    const filteredCustomers = customers
        .filter((customer) => guestIds.has(customer.id))
        .map((customer) => {
            const relevant = filteredBookings.filter((booking) => booking.guestId === customer.id);
            return {
                ...customer,
                bookings: relevant.length,
                upcoming: relevant.filter((booking) => booking.stage === "upcoming").length,
                cancelled: relevant.filter((booking) => booking.stage === "cancelled").length,
                nightsStayed: relevant.filter((booking) => booking.stage === "past").reduce((total, booking) => total + booking.nights, 0),
                totalSpent: relevant.reduce((total, booking) => total + booking.amountPaid - booking.amountRefunded, 0),
                listings: [...new Set(relevant.map((booking) => booking.hotelName))],
            };
        });

    return {
        listings: mockCustomerData.listings,
        customers: filteredCustomers,
        bookings: filteredBookings,
        summary: {
            customers: filteredCustomers.length,
            repeatCustomers: filteredCustomers.filter((customer) => customer.isRepeat).length,
            bookings: filteredBookings.length,
            upcoming: filteredBookings.filter((booking) => booking.stage === "upcoming").length,
            cancelled: filteredBookings.filter((booking) => booking.stage === "cancelled").length,
            revenue: filteredCustomers.reduce((total, customer) => total + customer.totalSpent, 0),
        },
    };
}

// Use the same booking records for overview totals, property-specific stats, and booking history.
// These rules mirror get_hotel_customer_history: completed/in-progress stays count toward nights
// and first/last stay, while the soonest UPCOMING check-in provides nextStay.
    export function customerFromBookings(customer: HotelCustomer, bookings: HotelBooking[]): HotelCustomer {    const stays = bookings.filter((b) => b.stage === "past" || b.stage === "in-stay");

    const upcoming = bookings.filter((b) => b.stage === "upcoming");
    const stayDates = stays.map((b) => b.checkIn).sort();
    const upcomingDates = upcoming.map((b) => b.checkIn).sort();
    const total = bookings.reduce((sum, b) => sum + b.amountPaid - b.amountRefunded, 0);

    return {
        ...customer,
        bookings: bookings.length,
        cancelled: bookings.filter((b) => b.stage === "cancelled").length,
        upcoming: upcoming.length,
        nightsStayed: stays.reduce((sum, b) => sum + b.nights, 0),
        totalSpent: Math.round(total * 100) / 100,
        firstStay: stayDates[0] ?? null,
        lastStay: stayDates[stayDates.length - 1] ?? null,
        nextStay: upcomingDates[0] ?? null,
        isRepeat: bookings.filter((b) => b.stage !== "cancelled").length >= 2,
        listings: [...new Set(bookings.map((b) => b.hotelName))].sort(),
    };
}

// Development-only preview. Move one of Sarah's EXISTING stays to Pacific Terrace,
// keeping her original booking count and total payments unchanged.
export function sampleHistory(propertyId: string): HotelCustomerHistory {
    const base = filterMockCustomerData("");
    const addedBookings: HotelBooking[] = [];
    const addedCustomers: HotelCustomer[] = [];

    for (let i = 1; i <= 75; i++) {
        const harbor = i % 2 === 0;
        const hotelId = harbor ? "mock-harbor-house" : "mock-pacific-terrace";
        const hotelName = harbor ? "Harbor House" : "Pacific Terrace";
        const stage: HotelBooking["stage"] = i % 4 === 0 ? "cancelled" : i % 4 === 1 ? "past" : "upcoming";
        const paid = 240 + (i % 5) * 20;
        const refunded = stage === "cancelled" ? paid - 25 : 0;
        const guestId = `test-guest-${i}`;
        const checkIn = stage === "upcoming"
            ? new Date(Date.UTC(2026, 11, 1 + (i % 26))).toISOString().slice(0, 10)
            : "2026-10-20";
        const checkOut = stage === "upcoming"
            ? new Date(Date.parse(`${checkIn}T00:00:00Z`) + 2 * 86400000).toISOString().slice(0, 10)
            : "2026-10-22";

        const booking: HotelBooking = {
            id: `test-reservation-${i}`, code: `TEST-${String(i).padStart(4, "0")}`,
            hotelId, hotelName, roomType: harbor ? "Coastal king" : "Ocean queen",
            guestId, guestName: `Test Guest ${String(i).padStart(2, "0")}`,
            guestEmail: `guest${i}@example.com`, checkIn,
            checkOut,
            nights: 2, guests: 2, children: 0, stage, totalPrice: paid,
            amountPaid: paid, amountRefunded: refunded,
            cancellationFee: stage === "cancelled" ? 25 : null,
            hasInsurance: false, bookedAt: "2026-09-15",
            cancelledAt: stage === "cancelled" ? "2026-10-01" : null,
        };
        addedBookings.push(booking);
        addedCustomers.push({
            id: guestId, name: booking.guestName, email: booking.guestEmail,
            bookings: 1, cancelled: 0, upcoming: 0, nightsStayed: 0,
            totalSpent: 0, firstStay: null, lastStay: null, nextStay: null,
            isRepeat: false, listings: [hotelName],
        });
    }

    const originalBookings = base.bookings.map((booking) =>
        booking.id === "mock-reservation-3"
            ? {...booking, hotelId: "mock-pacific-terrace", hotelName: "Pacific Terrace", roomType: "Ocean queen"}
            : booking
    );

    const allBookings = [...originalBookings, ...addedBookings];
    const filteredBookings = propertyId
        ? allBookings.filter((booking) => booking.hotelId === propertyId)
        : allBookings;

    const customers = [...base.customers, ...addedCustomers]
        .map((customer) => {
            const stays = filteredBookings.filter((booking) => booking.guestId === customer.id);
            return stays.length ? customerFromBookings(customer, stays) : null;
        })
        .filter((customer): customer is HotelCustomer => customer !== null);

    return {
        listings: base.listings,
        customers,
        bookings: filteredBookings,
        summary: summarizeOwner(customers),
    };
}
