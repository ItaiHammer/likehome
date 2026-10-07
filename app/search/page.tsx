import { SearchExperience } from "../_components/SearchExperience";
import { SkyBackground } from "../_components/SkyBackground";
import { DESTINATIONS } from "../_data/destinations";
import { searchAvailableHotels } from "@/utils/search";
import { Pagination } from "./components/Pagination";
import { SearchResultCard, type HotelSearchResult } from "./components/SearchResultCard";
import { SortSelect } from "./components/SortSelect";
import { getMockSearchResults } from "./mockResults";

type RawParams = Record<string, string | string[] | undefined>;
type SortValue = "recommended" | "price-low" | "price-high";

const PAGE_SIZE = 21;


function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l1.1 3.2L16 7.4l-2.9 1.2L12 12l-1.1-3.4L8 7.4l2.9-1.2L12 3z" strokeLinejoin="round" />
      <path d="M18.2 12.2l.8 2.1 2 .8-2 .8-.8 2.1-.8-2.1-2-.8 2-.8.8-2.1zM5.4 13.5l.7 1.8 1.7.7-1.7.7-.7 1.8-.7-1.8-1.7-.7 1.7-.7.7-1.8z" strokeLinejoin="round" />
    </svg>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const raw = await searchParams;
  const params = normalizeParams(raw);
  const aiPrompt = params.aiPrompt?.trim();
  const isDevAiPreview =
    process.env.NODE_ENV === "development" && Boolean(aiPrompt) && !hasStructuredSearchCriteria(params);
  const aiPreviewResult = isDevAiPreview && aiPrompt ? buildDevAiPreview(params, aiPrompt) : null;
  const aiPreview = aiPreviewResult && "params" in aiPreviewResult ? aiPreviewResult : null;
  const aiPreviewError = aiPreviewResult && "error" in aiPreviewResult ? aiPreviewResult.error : "";
  const previewParams = aiPreview?.params;

  const resolvedParams: SearchParams = previewParams
      ? {
        ...previewParams,
        tags: previewParams.tags ?? [],
        aiReply: aiPreview?.reply,
      }
      : params;
  const aiReply = resolvedParams.aiReply?.trim();
  const hasStructuredSearch = hasStructuredSearchCriteria(resolvedParams);
  const navigationParams = toRawParams(resolvedParams);

  let data: HotelSearchResult[] = [];
  let total = 0;
  let searchError = "";
  let usingMockData = false;

  // TODO(INTEGRATION): Once Cara's AI endpoint is merged into dev, replace
  // buildDevAiPreview with the real endpoint response. The preview is deliberately
  // development-only so it cannot ship as fake AI behavior.
  const shouldSearch = !aiPrompt || hasStructuredSearch;

  if (aiPreview) {
    const mock = getMockSearchResults(resolvedParams);
    data = mock.data;
    total = mock.total;
    usingMockData = true;
  } else if (!aiPreviewError && shouldSearch) {
    try {
      const result = await searchAvailableHotels(toDatabaseFilters(resolvedParams));
      data = Array.isArray(result.data) ? (result.data as HotelSearchResult[]) : [];
      total = Number(result.total ?? 0);
      if (result.error) searchError = "We couldn't load stays right now. Please try again.";
    } catch (error) {
      console.error("Search failed", error);
      searchError = "We couldn't load stays right now. Please try again.";
    }

    // TODO(INTEGRATION): Remove this local-only fallback once the shared Supabase
    // project has enough seeded hotel/room data for reliable frontend testing.
    // It never runs in production and never replaces real database results.
    if (process.env.NODE_ENV === "development" && data.length === 0) {
      const mock = getMockSearchResults(resolvedParams);
      data = mock.data;
      total = mock.total;
      usingMockData = true;
      searchError = "";
    }
  }

  const currentPage = positiveInt(resolvedParams.page, 1);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilterCount = getActiveFilterCount(resolvedParams);
  const locationHeading = resolvedParams.where ? `Stays in ${resolvedParams.where}` : "Stays for you";

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative isolate z-10 px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-10">
        <div className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_30%,transparent)]">
          <SkyBackground />
        </div>

        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-semibold text-blue">Find your next stay</p>
          <SearchExperience
            compact
            initialMode={aiPrompt ? "ai" : "standard"}
            initialValues={{
              where: resolvedParams.where,
              checkIn: resolvedParams.checkIn,
              checkOut: resolvedParams.checkOut,
              adults: positiveInt(resolvedParams.adults, 2),
              children: nonNegativeInt(resolvedParams.children, 0),
              minPrice: resolvedParams.minPrice,
              maxPrice: resolvedParams.maxPrice,
              minRating: resolvedParams.minRating,
              numBeds: resolvedParams.numBeds,
              bedSize: resolvedParams.bedSize,
              tags: resolvedParams.tags,
              aiPrompt,
            }}
          />
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
        {aiReply && <AiReplyCard reply={aiReply} params={resolvedParams} />}
        {aiPreviewError && <AiErrorCard message={aiPreviewError} />}
        {usingMockData && <MockDataNotice />}

        {!aiPreviewError && (
        <div className="flex flex-col gap-5 border-b border-edge pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue">Search results</p>
            <h1 className="mt-1 font-serif text-[36px] leading-[44px] text-ink sm:text-[44px] sm:leading-[52px]">{locationHeading}</h1>
            <p className="mt-2 text-sm text-slate">
              {searchError
                ? "Results unavailable"
                : shouldSearch
                  ? `${total} ${total === 1 ? "stay" : "stays"} found`
                  : "Your AI request is ready for interpretation"}
              {activeFilterCount > 0 && ` · ${activeFilterCount} ${activeFilterCount === 1 ? "filter" : "filters"} applied`}
            </p>
          </div>

          <SortSelect current={resolvedParams.sort} params={navigationParams} />
        </div>
        )}

        {aiPreviewError ? null : searchError ? (
          <StatePanel
            title="We couldn't load stays"
            body="Try the search again. If this keeps happening, the search service may be temporarily unavailable."
          />
        ) : aiPrompt && !hasStructuredSearch ? (
          <StatePanel
            title="AI search is almost connected"
            body="The prompt experience is ready. Once the AI search endpoint is merged into dev, this request will be translated into search filters and the matching stays will appear here."
          />
        ) : data.length === 0 ? (
          <StatePanel title="No stays found" body="Try changing the destination, dates, guest count, or filters." />
        ) : (
          <>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((stay, index) => (
                <SearchResultCard key={String(stay.id ?? index)} stay={stay} />
              ))}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} params={navigationParams} />
          </>
        )}
      </main>
    </div>
  );
}

type SearchParams = {
  where?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  children?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  numBeds?: string;
  bedSize?: string;
  tags: string[];
  sort?: SortValue;
  page?: string;
  aiPrompt?: string;
  aiReply?: string;
};

function normalizeParams(raw: RawParams): SearchParams {
  const sort = first(raw.sort);
  return {
    where: first(raw.where),
    checkIn: first(raw.checkIn),
    checkOut: first(raw.checkOut),
    adults: first(raw.adults),
    children: first(raw.children),
    minPrice: first(raw.minPrice),
    maxPrice: first(raw.maxPrice),
    minRating: first(raw.minRating),
    numBeds: first(raw.numBeds),
    bedSize: first(raw.bedSize),
    tags: values(raw.tags),
    sort: sort === "price-low" || sort === "price-high" ? sort : "recommended",
    page: first(raw.page),
    aiPrompt: first(raw.aiPrompt),
    aiReply: first(raw.aiReply),
  };
}

function toRawParams(params: SearchParams): RawParams {
  return {
    where: params.where,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: params.adults,
    children: params.children,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    minRating: params.minRating,
    numBeds: params.numBeds,
    bedSize: params.bedSize,
    tags: params.tags.length ? params.tags : undefined,
    sort: params.sort,
    page: params.page,
    aiPrompt: params.aiPrompt,
    aiReply: params.aiReply,
  };
}

function buildDevAiPreview(params: SearchParams, prompt: string) {
  const lower = prompt.toLocaleLowerCase();
  const tags = new Set(params.tags);

  if (lower.includes("pool")) tags.add("Pool");
  if (lower.includes("breakfast") || lower.includes("free meal")) tags.add("Free Meals");
  if (lower.includes("wifi") || lower.includes("wi-fi")) tags.add("Free Wi-Fi");
  if (lower.includes("gym")) tags.add("Gym");
  if (lower.includes("parking")) tags.add("Parking");
  if (lower.includes("kitchen")) tags.add("Kitchen");
  if (lower.includes("pet")) tags.add("Pets");
  if (lower.includes("family") || lower.includes("families")) tags.add("Families");

  const guestMatch = lower.match(/\b(\d+)\s+(?:of us|guests?|people|travelers?)\b/);
  const maxPriceMatch = lower.match(/(?:under|below|less than|up to|max(?:imum)?(?: of)?)\s*\$?\s*(\d+)/);
  const bedMatch = lower.match(/\b(\d+)\+?\s*beds?\b/);
  const ratingMatch = lower.match(/\b([1-5](?:\.\d)?)\+?\s*stars?\b/);

  let where = params.where;
  if (!where) {
    if (lower.includes("france") || lower.includes("paris")) where = "Paris, France";
    else if (lower.includes("hawaii") || lower.includes("honolulu")) where = "Honolulu, Hawaii, United States";
    else if (lower.includes("miami")) where = "Miami, Florida, United States";
    else if (lower.includes("italy") || lower.includes("positano")) where = "Positano, Campania, Italy";
    else if (lower.includes("portugal") || lower.includes("lisbon")) where = "Lisbon, Lisbon, Portugal";
    else if (lower.includes("banff") || lower.includes("canada")) where = "Banff, Alberta, Canada";
    else if (lower.includes("san diego")) where = "San Diego, California, United States";
    else if (lower.includes("mexico") || lower.includes("tulum")) where = "Tulum, Quintana Roo, Mexico";
  }

  let bedSize = params.bedSize;
  if (!bedSize) {
    if (lower.includes("king bed")) bedSize = "King";
    else if (lower.includes("queen bed")) bedSize = "Queen";
    else if (lower.includes("twin xl")) bedSize = "Twin XL";
    else if (lower.includes("twin bed")) bedSize = "Twin";
    else if (lower.includes("double bed")) bedSize = "Double";
  }

  const extractedSomething = Boolean(
    where ||
      guestMatch ||
      maxPriceMatch ||
      bedMatch ||
      ratingMatch ||
      bedSize ||
      tags.size > params.tags.length,
  );

  if (!extractedSomething) {
    return {
      error:
        "I couldn't confidently turn that into search filters. Try adding a destination, guest count, budget, bed preference, or amenity.",
    };
  }

  const previewParams: SearchParams = {
    ...params,
    where,
    adults: guestMatch?.[1] ?? params.adults ?? "2",
    maxPrice: maxPriceMatch?.[1] ?? params.maxPrice,
    minRating: ratingMatch?.[1] ?? params.minRating,
    numBeds: bedMatch?.[1] ?? params.numBeds,
    bedSize,
    tags: [...tags],
    page: "1",
  };

  const replyParts: string[] = [];
  if (where) replyParts.push(`in ${where}`);
  const guests = positiveInt(previewParams.adults, 0) + nonNegativeInt(previewParams.children, 0);
  if (guests > 0) replyParts.push(`for ${guests} ${guests === 1 ? "guest" : "guests"}`);
  if (previewParams.maxPrice) replyParts.push(`under $${previewParams.maxPrice} per night`);

  const priorities: string[] = [];
  if (tags.has("Pool")) priorities.push("a pool");
  if (tags.has("Free Meals")) priorities.push("free breakfast");
  if (tags.has("Free Wi-Fi")) priorities.push("free Wi-Fi");
  if (tags.has("Gym")) priorities.push("a gym");
  if (tags.has("Parking")) priorities.push("parking");
  if (tags.has("Kitchen")) priorities.push("a kitchen");

  const scope = replyParts.length ? ` ${replyParts.join(" ")}` : "";
  const priorityText = priorities.length ? `, prioritizing ${joinNaturalLanguage(priorities)}` : "";

  return {
    params: previewParams,
    reply: `I found stays${scope}${priorityText}. Here are the best matches from your request.`,
  };
}

function joinNaturalLanguage(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function toDatabaseFilters(params: SearchParams) {
  const location = parseLocation(params.where);
  return {
    ...location,
    check_in: params.checkIn || undefined,
    check_out: params.checkOut || undefined,
    guests: positiveInt(params.adults, 2) + nonNegativeInt(params.children, 0),
    min_price: optionalNumber(params.minPrice),
    max_price: optionalNumber(params.maxPrice),
    min_rating: optionalNumber(params.minRating),
    num_beds: optionalNumber(params.numBeds),
    bed_size: params.bedSize || undefined,
    tags: params.tags.length ? params.tags : undefined,
    sort: params.sort ?? "recommended",
    page: positiveInt(params.page, 1),
    page_size: PAGE_SIZE,
  };
}

function parseLocation(where?: string) {
  const trimmed = where?.trim();
  if (!trimmed) return {};

  const match = DESTINATIONS.find(([city, region]) => `${city}, ${region}`.toLocaleLowerCase() === trimmed.toLocaleLowerCase());
  if (!match) return { query: trimmed };

  const [city, area] = match;
  const pieces = area.split(",").map((piece) => piece.trim());
  const country = pieces.at(-1);
  const region = pieces.length > 1 ? pieces.slice(0, -1).join(", ") : undefined;
  return { city, region, country };
}

function hasStructuredSearchCriteria(params: SearchParams) {
  return Boolean(
    params.where ||
      params.checkIn ||
      params.checkOut ||
      params.minPrice ||
      params.maxPrice ||
      params.minRating ||
      params.numBeds ||
      params.bedSize ||
      params.tags.length,
  );
}

function getActiveFilterCount(params: SearchParams) {
  return (
    Number(Boolean(params.minPrice || params.maxPrice)) +
    Number(Boolean(params.minRating)) +
    Number(Boolean(params.numBeds)) +
    Number(Boolean(params.bedSize)) +
    params.tags.length
  );
}

function AiReplyCard({ reply, params }: { reply: string; params: SearchParams }) {
  const chips = buildCriteriaChips(params);
  return (
    <section className="mb-7 rounded-2xl border border-edge bg-surface p-5 shadow-[0_16px_38px_-34px_rgba(7,13,47,0.35)] sm:p-6">
      <div className="flex gap-3.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue/20 bg-blue text-on-blue">
          <SparklesIcon />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-dark">LikeHome</p>
          <p className="mt-1 text-[15px] leading-6 text-ink">{reply}</p>
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span key={chip} className="rounded-full border border-blue/20 bg-blue/10 px-2.5 py-1 text-xs font-medium text-blue-dark">
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AiErrorCard({ message }: { message: string }) {
  return (
    <section className="mb-7 rounded-2xl border border-danger/35 bg-surface p-4 sm:p-5">
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/10 text-sm font-bold text-danger" aria-hidden>
          !
        </span>
        <div>
          <p className="text-sm font-semibold text-danger">Try adding a little more detail</p>
          <p className="mt-1 text-sm leading-6 text-ink">{message}</p>
        </div>
      </div>
    </section>
  );
}

function buildCriteriaChips(params: SearchParams) {
  const chips: string[] = [];
  if (params.where) chips.push(params.where);
  if (params.checkIn && params.checkOut) chips.push(`${params.checkIn} – ${params.checkOut}`);
  const guests = positiveInt(params.adults, 0) + nonNegativeInt(params.children, 0);
  if (guests > 0) chips.push(`${guests} ${guests === 1 ? "guest" : "guests"}`);
  if (params.minPrice || params.maxPrice) {
    if (params.minPrice && params.maxPrice) chips.push(`$${params.minPrice}–$${params.maxPrice}/night`);
    else if (params.maxPrice) chips.push(`Up to $${params.maxPrice}/night`);
    else chips.push(`From $${params.minPrice}/night`);
  }
  if (params.minRating) chips.push(`${params.minRating}+ stars`);
  if (params.numBeds) chips.push(`${params.numBeds}+ beds`);
  if (params.bedSize) chips.push(`${params.bedSize} beds`);
  chips.push(...params.tags);
  return chips;
}

function MockDataNotice() {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-edge bg-surface/75 px-4 py-3 text-sm text-slate">
      <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-blue/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-blue-dark">
        Demo data
      </span>
      <p>Temporary local listings are filling empty database results so you can test cards, filters, sorting, and pagination.</p>
    </div>
  );
}

function StatePanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-8 rounded-2xl border border-edge bg-surface px-6 py-12 text-center">
      <h2 className="font-serif text-[32px] leading-10 text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate">{body}</p>
    </section>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function values(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function optionalNumber(value?: string) {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

