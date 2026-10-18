# LikeHome

A hotel booking web app: search stays (with filters and AI search), book with a mock checkout, manage bookings, earn points, and list properties.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, Supabase (Postgres + Google sign-in) and Gemini (AI search).

## Run it locally

You need Node.js 20.9 or newer and git.

```bash
git clone https://github.com/ItaiHammer/likehome.git
cd likehome
git checkout dev          # team work lives on dev; main is not up to date
npm install
```

Create `.env.local` in the project folder (ask the team for the values, never commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

Then start the dev server and open http://localhost:3000:

```bash
npm run dev
```

In development, empty search results and My Bookings fall back to sample data (`/MyBookings?sample`), so pages can be tested without seeded data.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit tests (`tests/*.test.mjs`, Node's built-in test runner) |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Where things are

| Path | What's there |
| --- | --- |
| `app/` | Pages and API routes (`app/api/*`): search, reserve, checkout, MyBookings, listings, auth |
| `app/_components/` | Shared UI (search bar, calendar, buttons in `ui/`) |
| `components/` | Auth buttons used in the header |
| `utils/` | Supabase data access and server helpers (reservations, payments, points, search) |
| `lib/` | Pure logic shared by pages (bookings, listings, LiteAPI mapping, validation) |
| `supabase/migrations/` | SQL for search, overlap checks, points, saved checkout, insurance |
| `tests/` | Unit tests |

## Conventions

- Branch off `dev` (`<name>/<topic>`), open a PR into `dev`, and get one review before merging.
- Dates are `YYYY-MM-DD` strings. "Today" is the guest's today: use `todayInTimeZone(tz)` from `utils/reservation-logic.ts` (the browser sends `tz` / `time_zone`; server pages read the `tz` cookie via `utils/guest-today.ts`). Avoid `todayUTC()` for anything a guest sees.
- Prices are always computed on the server, never taken from the browser.
