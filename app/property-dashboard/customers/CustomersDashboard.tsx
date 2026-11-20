"use client";

import {useEffect, useMemo, useState} from "react";
import type {HotelBooking, HotelCustomer, HotelCustomerHistory} from "@/lib/hotel-customers";
import {summarizeOwner} from "@/lib/hotel-customers";
import {filterMockCustomerData} from "./mockCustomerData";
import {PropertyPicker} from "../_components/PropertyPicker";

const PAGE_SIZE = 10;
const card = "rounded-lg border border-edge bg-surface p-5 sm:p-6";
const button = "rounded-control border border-edge bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:bg-blue/5 focus-visible:outline-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-40";
const input = "w-full rounded-control border border-edge bg-surface px-3 py-2.5 font-sans text-sm text-ink placeholder:text-slate focus-visible:outline-2 focus-visible:outline-blue";

function money(value: number) {
    return new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format(value);
}

function date(value: string | null) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-US", {
        month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
    }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function pageItems(current: number, count: number): Array<number | "dots"> {
    if (count <= 5) return Array.from({length: count}, (_, i) => i + 1);
    const numbers = [...new Set([1, current - 1, current, current + 1, count]
        .filter((n) => n >= 1 && n <= count))].sort((a, b) => a - b);
    const items: Array<number | "dots"> = [];
    numbers.forEach((n, index) => {
        if (index > 0 && n - numbers[index - 1] > 1) items.push("dots");
        items.push(n);
    });
    return items;
}

function Pagination({page, pages, onChange}: {
    page: number; pages: number; onChange: (page: number) => void;
}) {
    if (pages <= 1) return null;
    return (
        <nav aria-label="Customer pages" className="flex flex-wrap items-center justify-center gap-1.5 py-2 text-sm">
            <button type="button" className={button} disabled={page === 1}
                    onClick={() => onChange(page - 1)}>Previous
            </button>
            {pageItems(page, pages).map((item, i) => item === "dots" ? (
                <span key={`dots-${i}`} aria-hidden="true" className="px-1 text-slate">…</span>
            ) : (
                <button key={item} type="button" aria-label={`Page ${item}`}
                        aria-current={item === page ? "page" : undefined}
                        onClick={() => onChange(item)}
                        className={`min-w-8 rounded-control px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-blue ${item === page ? "bg-blue text-on-blue" : "text-ink hover:bg-blue/10"}`}>
                    {item}
                </button>
            ))}
            <button type="button" className={button} disabled={page === pages}
                    onClick={() => onChange(page + 1)}>Next
            </button>
        </nav>
    );
}

// Use the same booking records for overview totals, property-specific stats, and booking history.
// These rules mirror get_hotel_customer_history: completed/in-progress stays count toward nights
// and first/last stay, while the soonest UPCOMING check-in provides nextStay.
function customerFromBookings(customer: HotelCustomer, bookings: HotelBooking[]): HotelCustomer {
    const stays = bookings.filter((b) => b.stage === "past" || b.stage === "in-stay");
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
function sampleHistory(propertyId: string): HotelCustomerHistory {
    const base = filterMockCustomerData("");
    const addedBookings: HotelBooking[] = [];
    const addedCustomers: HotelCustomer[] = [];

    for (let i = 1; i <= 75; i++) {
        const harbor = i % 2 === 0;
        const hotelId = harbor ? "mock-harbor" : "mock-terrace";
        const hotelName = harbor ? "Harbor House" : "Pacific Terrace";
        const stage: HotelBooking["stage"] = i % 4 === 0 ? "cancelled" : i % 4 === 1 ? "past" : "upcoming";
        const paid = 240 + (i % 5) * 20;
        const refunded = stage === "cancelled" ? paid - 25 : 0;
        const guestId = `test-guest-${i}`;
        const checkIn = stage === "upcoming" ? "2026-12-20" : "2026-10-20";

        const booking: HotelBooking = {
            id: `test-reservation-${i}`, code: `TEST-${String(i).padStart(4, "0")}`,
            hotelId, hotelName, roomType: harbor ? "Coastal king" : "Ocean queen",
            guestId, guestName: `Test Guest ${String(i).padStart(2, "0")}`,
            guestEmail: `guest${i}@example.com`, checkIn,
            checkOut: stage === "upcoming" ? "2026-12-22" : "2026-10-22",
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
            ? {...booking, hotelId: "mock-terrace", hotelName: "Pacific Terrace", roomType: "Ocean queen"}
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

export function CustomersDashboard() {
    const [demo, setDemo] = useState(process.env.NODE_ENV === "development");
    const [property, setProperty] = useState("");
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [customerProperty, setCustomerProperty] = useState("");
    const [page, setPage] = useState(1);
    const [liveData, setLiveData] = useState<HotelCustomerHistory | null>(null);
    const [loading, setLoading] = useState(process.env.NODE_ENV !== "development");
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        if (demo) return;
        const controller = new AbortController();
        const url = property
            ? `/api/listings/customers?hotel=${encodeURIComponent(property)}`
            : "/api/listings/customers";

        (async () => {
            try {
                const response = await fetch(url, {cache: "no-store", signal: controller.signal});
                const payload: unknown = await response.json();
                if (!response.ok || !payload || typeof payload !== "object" || !("customers" in payload)) {
                    throw new Error("Couldn't load customer history.");
                }
                if (!controller.signal.aborted) setLiveData(payload as HotelCustomerHistory);
            } catch (err) {
                if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Couldn't load customers.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        })();
        return () => controller.abort();
    }, [demo, property, retry]);

    // Details remain BELOW the customer list; only the viewport scrolls.
    useEffect(() => {
        if (!selectedId) return;
        const frame = window.requestAnimationFrame(() => {
            document.getElementById("selected-customer-details")?.scrollIntoView({
                behavior: "smooth", block: "start",
            });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [selectedId]);

    const data = useMemo(
        () => demo ? sampleHistory(property) : liveData,
        [demo, property, liveData]
    );

    const customers = useMemo(() => {
        const search = query.trim().toLowerCase();
        // A lone period or punctuation is not a meaningful customer search.
        if (search && !/[\p{L}\p{N}]/u.test(search)) return [];
        return (data?.customers ?? []).filter((person) => !search || [
            person.name, person.email, ...person.listings,
            ...(data?.bookings.filter((booking) => booking.guestId === person.id)
                .map((booking) => booking.code) ?? []),
        ].some((value) => value?.toLowerCase().includes(search)));
    }, [data, query]);

    const pages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
    const safePage = Math.min(page, pages);
    const visibleCustomers = customers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const selected = customers.find((customer) => customer.id === selectedId) ?? null;

    const allCustomerBookings = (data?.bookings ?? []).filter((booking) => booking.guestId === selectedId);
    const customerProperties = [...new Map(allCustomerBookings.map((booking) => [
        booking.hotelId, {value: booking.hotelId, label: booking.hotelName},
    ])).values()].sort((a, b) => a.label.localeCompare(b.label));
    const selectedBookings = customerProperty
        ? allCustomerBookings.filter((booking) => booking.hotelId === customerProperty)
        : allCustomerBookings;
    const selectedStats = selected ? customerFromBookings(selected, selectedBookings) : null;

    const propertyName = data?.listings.find((hotel) => hotel.id === property)?.name ?? "All owned properties";

    function chooseCustomer(id: string) {
        setSelectedId((current) => current === id ? null : id);
        setCustomerProperty("");
    }

    function changeProperty(id: string) {
        setProperty(id);
        setPage(1);
        setSelectedId(null);
        setCustomerProperty("");
        if (!demo) {
            setLoading(true);
            setError("");
        }
    }

    function changePage(next: number) {
        setPage(next);
        setSelectedId(null);
        setCustomerProperty("");
    }

    return (
        <div className="space-y-5 font-sans">
            {process.env.NODE_ENV === "development" && (
                <div className="flex flex-wrap items-center gap-3">
                    <button type="button" className={button} onClick={() => {
                        const next = !demo;
                        setDemo(next);
                        setLoading(!next);
                        setError("");
                        setProperty("");
                        setQuery("");
                        setPage(1);
                        setSelectedId(null);
                        setCustomerProperty("");
                    }}>{demo ? "Return to live data" : "Preview sample data"}</button>
                    {demo && <span className="text-xs text-slate">SAMPLE DATA — local preview only (not saved)</span>}
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                    <label htmlFor="customer-search" className="mb-1.5 block text-sm text-ink">Find a customer</label>
                    <input id="customer-search" className={input} type="search" value={query}
                           onChange={(event) => {
                               setQuery(event.target.value);
                               setPage(1);
                               setSelectedId(null);
                               setCustomerProperty("");
                           }} placeholder="Search by name, email, or reservation code"/>
                </div>
                <div className="sm:w-56">
                    <PropertyPicker id="customer-property" label="Property" value={property} onChange={changeProperty}
                                    options={[{
                                        value: "",
                                        label: "All owned properties"
                                    }, ...(data?.listings ?? []).map((hotel) => ({
                                        value: hotel.id, label: hotel.name,
                                    }))]}/>
                </div>
            </div>

            {!demo && loading && <section role="status" className={card}>Loading customers…</section>}
            {!demo && error && (
                <section role="alert" className={card}>{error}{" "}
                    <button type="button" className="text-blue-dark underline" onClick={() => {
                        setLoading(true);
                        setError("");
                        setRetry((value) => value + 1);
                    }}>Retry
                    </button>
                </section>
            )}

            {data && (demo || (!loading && !error)) && (
                <>
                    {!selected && (
                        <section className={card} aria-label="Customer overview">
                            <h2 className="font-serif text-[30px] text-ink">Customer overview</h2>
                            <p className="mt-2 text-sm text-slate">
                                A summary of reservations for {property ? propertyName : "all your properties"}.
                            </p>
                            <dl className="mt-5 grid grid-cols-2 gap-5 border-t border-edge pt-5 sm:grid-cols-3">
                                {([
                                    ["Customers", data.summary.customers],
                                    ["Reservations", data.summary.bookings],
                                    ["Upcoming", data.summary.upcoming],
                                    ["Repeat customers", data.summary.repeatCustomers],
                                    ["Cancelled reservations", data.summary.cancelled],
                                    ["Net room payments", money(data.summary.revenue)],
                                ] as const).map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-sm text-ink">{label}</dt>
                                        <dd className="mt-1 text-xl text-ink">{data.listings.length === 0 ? "\u2014" : value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}

                    <section className={card} aria-label="Customers">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className="font-serif text-[30px] text-ink">Your customers</h2>
                            <span
                                className="text-sm text-slate">{data.listings.length === 0 ? "\u2014" : `${customers.length} ${customers.length === 1 ? "customer" : "customers"}`}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate">Select a customer to view their details and reservation
                            history.</p>
                        {customers.length ? (
                            <div className="mt-5 min-w-0">
                                <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] gap-4 border-b border-edge pb-3 text-sm text-ink sm:grid">
                                    <span>Customer</span><span>Reservations</span><span>Net payments</span>
                                </div>
                                {visibleCustomers.map((person) => (
                                    <button key={person.id} type="button" aria-pressed={selectedId === person.id}
                                            aria-label={`View details for ${person.name || person.email || "guest"}`}
                                            onClick={() => chooseCustomer(person.id)}
                                            className={`grid w-full min-w-0 grid-cols-2 gap-x-3 gap-y-2 border-b border-edge px-2 py-3.5 text-left font-sans transition-[background-color,box-shadow] hover:bg-blue/5 hover:shadow-sm focus-visible:bg-blue/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] sm:items-center sm:gap-4 ${selectedId === person.id ? "bg-blue/10" : ""}`}>
                                        <span className="col-span-2 min-w-0 sm:col-span-1">
                                            <span className="block truncate text-base text-ink">{person.name || "Guest"}</span>
                                            <span className="block truncate text-xs text-slate">{person.email || "Email unavailable"}</span>
                                        </span>
                                        <span className="min-w-0 text-sm text-ink">
                                            <span className="mb-1 block text-xs text-slate sm:hidden">Reservations</span>
                                            {person.bookings}
                                        </span>
                                        <span className="min-w-0 text-sm text-ink">
                                            <span className="mb-1 block text-xs text-slate sm:hidden">Net payments</span>
                                            {money(person.totalSpent)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-5 rounded-control bg-paper p-6 text-center text-sm text-slate">
                                {query ? "No customers match your search." : data.listings.length === 0 ? "Add a property to start seeing customer history." : "No customer bookings yet."}
                            </p>
                        )}
                        <p className="mt-4 text-xs text-slate">Only guests who have booked your properties are
                            shown.</p>
                        <div className="mt-3"><Pagination page={safePage} pages={pages} onChange={changePage}/></div>
                    </section>

                    {selected && selectedStats && (
                        <section id="selected-customer-details" className={`${card} scroll-mt-24`}
                                 aria-label="Selected customer details">
                            {/* Customer identity with optional property filter on the right. */}
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-edge pb-5">
                                <div className="min-w-0">
                                    <h2 className="font-serif text-[30px] text-ink">{selected.name || "Guest"}</h2>
                                    <p className="mt-1 break-words text-sm text-slate">{selected.email || "Email unavailable"}</p>
                                </div>
                                {customerProperties.length > 1 && (
                                    <div className="w-full sm:w-56">
                                        <PropertyPicker
                                            id="selected-customer-property"
                                            label="Viewing"
                                            value={customerProperty}
                                            onChange={setCustomerProperty}
                                            options={[{value: "", label: "All properties"}, ...customerProperties]}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Subtle information strip above the four customer statistics. */}
                            <dl className="mt-5 grid gap-4 rounded-control bg-blue/5 p-4 sm:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <dt className="text-xs text-slate">First stay</dt>
                                    <dd className="mt-1 text-sm text-ink">{date(selectedStats.firstStay)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate">Next stay · {selectedStats.upcoming} upcoming
                                    </dt>
                                    <dd className="mt-1 text-sm text-ink">{date(selectedStats.nextStay)}</dd>
                                </div>
                                <div className="sm:col-span-2 xl:col-span-1">
                                    <dt className="text-xs text-slate">Properties booked</dt>
                                    <dd className="mt-1 text-sm text-ink">{selectedStats.listings.join(", ") || "—"}</dd>
                                </div>
                            </dl>

                            <dl className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
                                {([
                                    ["Reservations", String(selectedStats.bookings)],
                                    ["Past stays", String(selectedBookings.filter((booking) => booking.stage === "past").length)],
                                    ["Nights stayed", String(selectedStats.nightsStayed)],
                                    ["Net room payments", money(selectedStats.totalSpent)],
                                ] as const).map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-sm text-ink">{label}</dt>
                                        <dd className="mt-1 text-xl text-ink">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}

                    {selected && (
                        <section className={card} aria-label="Customer booking history">
                            <h2 className="font-serif text-[30px] text-ink">Booking history</h2>
                            {selectedBookings.length ? (
                                <div className="mt-4 min-w-0">
                                    <table className="w-full text-left text-sm">
                                        <thead className="hidden md:table-header-group">
                                        <tr className="border-b border-edge text-ink">
                                            <th className="pb-3 font-normal">Reservation / dates</th>
                                            <th className="pb-3 font-normal">Room / property</th>
                                            <th className="pb-3 font-normal">Status</th>
                                            <th className="pb-3 font-normal">Payments</th>
                                        </tr>
                                        </thead>
                                        <tbody className="block space-y-3 md:table-row-group md:space-y-0 md:divide-y md:divide-edge">
                                        {selectedBookings.map((booking) => (
                                            <tr key={booking.id} className="block rounded-control border border-edge p-3 md:table-row md:rounded-none md:border-0 md:p-0">
                                                <td className="block py-2 pr-3 text-ink md:table-cell md:py-3">
                                                    <span className="mb-1 block text-xs text-slate md:hidden">Reservation / dates</span>
                                                    {booking.code}
                                                    <div
                                                        className="text-xs text-slate">{date(booking.checkIn)} – {date(booking.checkOut)}</div>
                                                </td>
                                                <td className="block py-2 pr-3 text-ink md:table-cell md:py-3">
                                                    <span className="mb-1 block text-xs text-slate md:hidden">Room / property</span>
                                                    {booking.roomType || "Room"}
                                                    <div className="text-xs text-slate">{booking.hotelName}</div>
                                                </td>
                                                <td className="block py-2 pr-3 capitalize text-ink md:table-cell md:py-3">
                                                    <span className="mb-1 block text-xs text-slate md:hidden">Status</span>
                                                    {booking.stage.replace("-", " ")}
                                                </td>
                                                <td className="block py-2 text-ink md:table-cell md:py-3">
                                                    <span className="mb-1 block text-xs text-slate md:hidden">Payments</span>
                                                    Charged: {money(booking.amountPaid)}
                                                    {booking.amountRefunded > 0 && (
                                                        <div
                                                            className="text-xs text-slate">Refunded: {money(booking.amountRefunded)}</div>
                                                    )}
                                                    {booking.cancellationFee !== null && booking.stage === "cancelled" && (
                                                        <div
                                                            className="text-xs text-slate">Fee: {money(booking.cancellationFee)}</div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="mt-4 text-sm text-slate">No reservations found.</p>}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
