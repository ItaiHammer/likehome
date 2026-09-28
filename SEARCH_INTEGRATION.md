# Search Integration Guide

## Current State

The search UI is complete enough to connect, but the actual search pipeline is still local/mock.

Supabase client/server/session helpers already exist under `utils/supabase/`, and account helpers exist in `utils/accounts.ts`. The search feature itself intentionally does **not** assume whether listings should be fetched directly from Supabase or through a project API/service layer.

**Confirm that architecture with the backend team before wiring search.**

## What the Backend/Search Layer Needs to Receive

A real search request should be able to represent:

- destination
- check-in date
- check-out date
- guest count
- min/max price
- minimum rating
- property types
- amenities
- minimum beds
- connecting rooms requirement
- Good for categories
- sort option
- page / page size

The current frontend state for all of these already exists in `app/search/page.tsx` and `FilterModal.tsx`.

## What the Frontend Expects Back

Keep the API/database result shape aligned with `app/search/types.ts`.

Core listing data currently used by the UI:

- `id`
- `name`
- `city`, optional `region`, `country`
- `pricePerNight`
- `rating`
- `propertyType`
- `amenities`
- `highlights`
- `maxGuests`
- `beds`
- `connectingRooms`
- `goodFor`
- optional `imageUrls`

`kidFriendly` still exists for compatibility with an earlier data shape, but it is not the active family filter. Confirm whether it belongs in the final schema.

Popular destinations need:

- display `name`
- searchable `searchValue`
- scope (`nearby`, `national`, `international`)
- optional destination image URL

## Important Integration Rules

### Date Availability

The frontend currently validates and stores the selected date range, but **does not simulate availability**.

The backend/search layer must use check-in/check-out dates to exclude unavailable stays.

### Guest Capacity

Guest capacity is currently enforced locally with `maxGuests`. Preserve this rule when moving filtering server-side.

### Recommended Sort

`Recommended` currently keeps the mock-data ordering. Replace it with the backend's relevance/recommendation ordering when available.

### Destination Autocomplete

Autocomplete is currently generated from mock listing + destination data. Replace it with the agreed destination search/autocomplete source when available.

Some display destinations may map to another search value (example: a display name can map to its searchable city). Decide whether alias resolution belongs in the frontend or search service.

### Amenity Normalization

The frontend currently treats broader values as compatible with specific values, for example:

- `Breakfast available` also matches `Free breakfast`
- `Parking available` also matches `Free parking`

If the final database uses normalized amenity IDs, this compatibility helper may no longer be necessary.

### Near You

`Near you` is currently a static mock group. Decide whether future nearby results use:

- account/profile location
- browser location permission
- a backend-provided location

Do not treat the current nearby data as real geolocation.

### Images

Listing and destination images currently fall back to blue placeholders/gradients. Return real image URLs from the data source and keep a failure fallback for broken remote images.

## Auth + Routes Still to Connect

- Protect `/search` once the account/auth flow is finalized.
- Replace the placeholder account initial/menu with the signed-in user.
- Connect `/saved`.
- Connect `/dashboard`.
- Make `/listings/[id]` load the selected listing from the real data source.

## Loading / Error Handling

When search becomes asynchronous, add distinct states for:

- loading
- request/server failure
- valid zero results

Do not reuse the zero-results screen for a failed request.

## TODO Tags Used in the Code

The search code uses these tags so integration work is easy to find:

- `TODO(AUTH)` — authentication/account work
- `TODO(BACKEND)` — server/search behavior
- `TODO(DATABASE)` — final schema/value alignment
- `TODO(API)` — API-fed data such as autocomplete/images/location
- `TODO(ROUTE)` — unfinished route connections
- `TODO(ERROR)` — loading/failure behavior
- `TODO(INTEGRATION)` — architecture decisions between frontend/backend layers

For implementation details, search the codebase for the relevant tag instead of expanding these docs.
