import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getOtherStays } from "@/lib/other-stays";
import { matchingRoom, originalSearch, readRoomFilters } from "@/lib/stay-filters";
import { countNights, MAX_NIGHTS, parseDate, todayUTC } from "@/utils/reservation-logic";
import { createClient } from "@/utils/supabase/server";
import { addDays } from "../../_components/dates";
import { PageBackdrop } from "../../_components/PageBackdrop";
import { getStay, type Stay } from "../../_data/stays";
import { getHotelStay } from "./hotelStay";
import { StayReservation, type StayChoices } from "./StayReservation";

// Database hotels are read per request with the cookie-based Supabase client, which a prerendered
// page can't do: a production build would answer every hotel id with a 500.
export const dynamic = "force-dynamic";

// Cached per request, so the title and the page share one database lookup
const findStay = cache(async (slug: string) => getStay(slug) ?? (await getHotelStay(slug)));

// Room, dates and guests carried in the link (from a search result, or coming back from sign-in).
// Anything that doesn't fit this stay is dropped, so the card falls back to its defaults.
function readChoices(params: Record<string, string | string[] | undefined>, stay: Stay): StayChoices {
  const one = (key: string) => {
    const v = params[key];
    return typeof v === "string" ? v : undefined;
  };
  const count = (key: string, min: number, max: number) => {
    const n = Number(one(key));
    return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
  };
  const checkIn = one("checkIn");
  const checkOut = one("checkOut");
  // Server time is UTC in production; a day's slack keeps a US guest's "today" (the card checks it exactly)
  const earliest = addDays(todayUTC(), -1);
  const datesOk =
    !!checkIn &&
    !!checkOut &&
    !!parseDate(checkIn) &&
    !!parseDate(checkOut) &&
    checkIn >= earliest &&
    checkOut > checkIn &&
    countNights(checkIn, checkOut) <= MAX_NIGHTS;
  const adults = count("adults", 1, 16);
  const children = count("children", 0, 10);
  // Without a picked room, the cheapest one that passes the search's filters, as the search matched it
  const room =
    stay.rooms.find((r) => r.id === one("room") && !r.soldOut) ??
    matchingRoom(stay.rooms, stay.tags, readRoomFilters(params, (adults ?? 2) + (children ?? 0), { adults, children }));

  return {
    ...(datesOk ? { checkIn, checkOut } : {}),
    adults,
    children,
    roomId: room?.id,
  };
}

export async function generateMetadata(props: PageProps<"/reserve/[slug]">) {
  const { slug } = await props.params;
  const stay = await findStay(slug);
  return { title: stay ? `Reserve ${stay.name} — LikeHome` : "Stay not found — LikeHome" };
}

export default async function ReservePage(props: PageProps<"/reserve/[slug]">) {
  const { slug } = await props.params;
  const stay = await findStay(slug);
  if (!stay) notFound();

  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const account = claims?.sub ? { email: typeof claims.email === "string" ? claims.email : "" } : null;
  const otherStays = claims?.sub && stay.bookable ? await getOtherStays(claims.sub, stay.slug) : [];
  const params = await props.searchParams;

  return (
    <div className="relative isolate flex flex-1 flex-col">
      <PageBackdrop />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <StayReservation
          stay={stay}
          account={account}
          otherStays={otherStays}
          initial={readChoices(params, stay)}
          search={originalSearch(params)}
        />
      </main>
    </div>
  );
}
