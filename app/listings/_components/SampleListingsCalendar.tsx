"use client";

import {useEffect, useState} from "react";
import {Card} from "@/app/_components/ui";
import {calendarProperties, calendarStayParam, calendarStays} from "@/lib/owner-calendar";
import {sampleHistory} from "@/app/property-dashboard/customers/mockCustomerData";
import type {Listing} from "@/types/listing";
import {BookingCalendar} from "./BookingCalendar";
import {readSampleListings} from "./sample-listings";

const stays = calendarStays(sampleHistory("").bookings);

export function SampleListingsCalendar({listings, today, date, stay}: {
  listings: Listing[];
  today: string;
  date: string;
  stay?: string;
}) {
  const [current, setCurrent] = useState(listings);
  useEffect(() => {
    const refresh = () => setCurrent(readSampleListings(listings));
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [listings]);
  return (
    <Card as="section" padding="none" className="px-5 py-5 sm:px-[26px] sm:py-6">
      <BookingCalendar
        properties={calendarProperties(current)}
        stays={stays}
        today={today}
        initialDate={date}
        initialStay={calendarStayParam(stay, date, stays)}
      />
    </Card>
  );
}
