import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { partyOf } from "@/lib/liteapi/party";
import { isLiteapiId, saveLiteapiHotel } from "@/lib/liteapi/save";
import { savedHotelId } from "@/utils/liteapi-hotels";
import { getOtherStays } from "@/lib/other-stays";
import { matchingRoom, originalSearch, readRoomFilters } from "@/lib/stay-filters";
import { countNights, MAX_NIGHTS, parseDate, todayUTC } from "@/utils/reservation-logic";
import { createClient } from "@/utils/supabase/server";
import { addDays } from "../../_components/dates";
import { PageBackdrop } from "../../_components/PageBackdrop";
import { getStay, type Stay } from "../../_data/stays";
import { getHotelStay, withLiveRoomPrices } from "./hotelStay";
import { StayReservation, type StayChoices } from "./StayReservation";

// Database hotels are read per request with the cookie-based Supabase client, which a prerendered
// page can't do: a production build would answer every hotel id with a 500.
export const dynamic = "force-dynamic";

// Cached per request, so the title and the page share one database lookup
const findStay = cache(async (slug: string) => getStay(slug) ?? (await getHotelStay(slug)));

type SearchParams = Record<string, string | string[] | undefined>;
type StayDates = Pick<StayChoices, "checkIn" | "checkOut" | "adults" | "children">;

const one = (params: SearchParams, key: string) => {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
};

// Room, dates and guests carried in the link (from a search result, or coming back from sign-in).
// Anything that doesn't fit this stay is dropped, so the card falls back to its defaults.
function readStayDates(params: SearchParams): StayDates {
  const count = (key: string, min: number, max: number) => {
    const n = Number(one(params, key));
    return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
  };
  const checkIn = one(params, "checkIn");
  const checkOut = one(params, "checkOut");
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
  return {
    ...(datesOk ? { checkIn, checkOut } : {}),
    adults: count("adults", 1, 16),
    children: count("children", 0, 10),
  };
}

function queryOf(params: SearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value ?? []].flat()) query.append(key, item);
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

function readChoices(params: SearchParams, stay: Stay, dates: StayDates): StayChoices {
  const { adults, children } = dates;
  // Without a picked room, the cheapest one that passes the search's filters, as the search matched it
  const room =
    // A link can name any of a card's identical rooms
    stay.rooms.find((r) => (r.id === one(params, "room") || r.units?.some((u) => u.id === one(params, "room"))) && !r.soldOut) ??
    matchingRoom(stay.rooms, stay.tags, readRoomFilters(params, (adults ?? 2) + (children ?? 0), { adults, children }));

  return { ...dates, roomId: room?.id };
}

export async function generateMetadata(props: PageProps<"/reserve/[slug]">) {
  const { slug } = await props.params;
  // The page saves this one and moves on to its own id, so there's no stay to name yet
  if (isLiteapiId(slug)) return { title: "Opening stay… — LikeHome" };
  const stay = await findStay(slug);
  return { title: stay ? `Reserve ${stay.name} — LikeHome` : "Stay not found — LikeHome" };
}

export default async function ReservePage(props: PageProps<"/reserve/[slug]">) {
  const { slug } = await props.params;
  const params = await props.searchParams;
  const d = readStayDates(params);
  // A search result LiteAPI listed but nobody had opened yet: save it, then show it under its own id
  if (isLiteapiId(slug)) {
    const stay = d.checkIn && d.checkOut ? { checkIn: d.checkIn, checkOut: d.checkOut } : undefined;
    const id = (await savedHotelId(slug)) ?? (await saveLiteapiHotel(slug, stay));
    if (!id) notFound();
    redirect(`/reserve/${id}${queryOf(params)}`);
  }

  const stay = await findStay(slug);
  if (!stay) notFound();
  const priced =
    d.checkIn && d.checkOut && stay.liteapiId
      ? await withLiveRoomPrices(stay, { checkIn: d.checkIn, checkOut: d.checkOut, ...partyOf(d.adults ?? 2, d.children ?? 0) })
      : stay;

  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const account = claims?.sub ? { email: typeof claims.email === "string" ? claims.email : "" } : null;
  const otherStays = claims?.sub && stay.bookable ? await getOtherStays(claims.sub, stay.slug) : [];

  return (
    <div className="relative isolate flex flex-1 flex-col">
      <PageBackdrop />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <StayReservation
          stay={priced}
          account={account}
          otherStays={otherStays}
          initial={readChoices(params, priced, d)}
          search={originalSearch(params)}
        />
      </main>
    </div>
  );
}
