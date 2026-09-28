# Search / Filter / Sort Frontend Handoff

## Purpose

`/search` is the current LikeHome stays home/search experience. The root route (`/`) redirects to `/search` for now.

The page supports two main states:

- **Browse/home:** large intro, search controls, Popular Destinations, and a small Recommended stays preview.
- **Results:** compact search header, results summary, sorting, listing grid, pagination, and no-results actions.

The feature is currently frontend-driven with mock listing/destination data. It is structured so the mock pipeline can later be replaced by a backend/API request without rebuilding the UI.

## Main Files

| File | Responsibility |
| --- | --- |
| `app/search/page.tsx` | Page state, search validation, filtering/sorting/pagination, browse vs. results state |
| `app/search/components/SearchForm.tsx` | Destination, dates, guests, Filters button, autocomplete/calendar behavior |
| `app/search/components/FilterModal.tsx` | All filter groups and filter controls |
| `app/search/components/PopularDestinations.tsx` | Near you / National / International destination carousel |
| `app/search/components/ListingCard.tsx` | Stay cards and `/listings/[id]` links |
| `app/search/components/ListingsToolbar.tsx` | Sort control only |
| `app/search/components/EmptyResults.tsx` | Valid zero-results state and recovery actions |
| `app/search/lib/searchConfig.ts` | Filter/sort options, limits, pagination constants |
| `app/search/lib/searchUtils.ts` | Destination matching, autocomplete data, amenity compatibility helpers |
| `app/search/types.ts` | Shared listing/destination types |
| `app/search/mockListings.ts` | Temporary mock destinations and stays |

## Current Behavior

### Search

A normal search requires:

- valid destination
- check-in and check-out dates
- at least 1 guest

Destination autocomplete uses current mock data. **Tab** accepts the first visible suggestion; **Enter** submits whatever is currently typed instead of auto-selecting a suggestion.

Dates are selected as a range. Past dates are disabled. The calendar closes when a valid range is completed, when clicking outside it, or with `Esc`.

**Important:** dates are collected and validated on the frontend, but mock results are **not** filtered by actual date availability.

### Filters

Filters are opened from the main search bar. Current groups are:

- Price
- Rating
- Property type
- Amenities
- Beds & rooms
- Good for

`Clear all` resets only filter state. It does **not** clear destination, dates, or guests. Guest capacity continues to apply whenever a guest value is present.

### Sort + Pagination

Sort options:

- Recommended
- Price: Low to high
- Price: High to low
- Highest rated

Pagination is configured for **21 stays per page**.

### Popular Destinations

Popular Destinations has three scopes:

- Near you
- National
- International

The carousel shows 3 destination cards at a time and auto-slides through the available destinations. Cards are direct search shortcuts and do not require dates/guests first.

### Listing Cards

Cards currently show:

- property name + location
- rating
- useful highlight/amenity chips
- guest capacity
- bed count
- property type
- price per night

Cards link to `/listings/[id]`; the detail route still needs its real implementation/data connection.

### No Results

A valid zero-result response shows the no-results state with:

- **Change destination**
- **Clear filters** when filters are active

Network/API failures should eventually use a separate error state rather than this UI.

## Routes Referenced by This Feature

- `/search` — stays home/search
- `/listings/[id]` — listing details (connection still needed)
- `/saved` — saved stays (connection still needed)
- `/dashboard` — bookings/dashboard (connection still needed)

## Quick Regression Check

After changing this feature, verify:

1. destination autocomplete + Tab/Enter behavior
2. calendar range selection and click-outside close
3. guest validation/capacity filtering
4. filters + Clear all
5. all four sort options
6. Popular Destination scope switching/carousel clicks
7. no-results actions
8. mobile/narrow layouts for search controls, calendar, filters, and cards

Run `npm run build` before handing off or merging.
