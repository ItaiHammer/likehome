# Owner booking & customer history tests (local Postgres only)

Checks `get_hotel_booking_history` and `get_hotel_customer_history` (`supabase/migrations/hotel_booking_history.sql`)
on a throwaway database that mirrors the columns they read. Never run this against the shared Supabase project.

With Docker:

```bash
docker run --rm -d --name owner-history -e POSTGRES_PASSWORD=postgres postgres:17
until docker exec owner-history pg_isready -U postgres -q; do sleep 1; done
for f in supabase/tests/owner-history/setup.sql supabase/migrations/hotel_booking_history.sql \
         supabase/tests/owner-history/scenarios.sql; do
  docker exec -i owner-history psql -U postgres -q -v ON_ERROR_STOP=1 < "$f" || break
done
docker stop owner-history
```

With a local Postgres, run `createdb owner_history` and then the same three files with
`psql -d owner_history -q -v ON_ERROR_STOP=1 -f <file>`.

Each check in `scenarios.sql` is an `assert` with a message saying what should hold. The run stops at the first one
that fails, and a full pass ends with `NOTICE: all owner history checks passed`. Today (`p_today`) is 2026-11-05
unless a check passes another date to test check-in and check-out days.
`scenarios.sql` rolls back at the end, so it can be run again on the same database.
