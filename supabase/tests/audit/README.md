# Audit migration tests (local Postgres only)

Checks the PR #141 audit migrations on a throwaway local database that mirrors the live tables,
RLS policies, triggers and functions they touch (copied read-only from the LikeHome project on
2026-10-25/26). Never run this against the shared Supabase project.

```bash
createdb audit
psql -d audit -f supabase/tests/audit/setup.sql
for f in 20261025_f13_lock_down_transactions 20261026_f1_save_listing \
         20261026_f3_listing_photos_bucket 20261026_f9_booked_nights 20261026_lock_reservation_fields \
         20261027_listing_photos_owner_select; do
  psql -d audit -v ON_ERROR_STOP=1 -f supabase/migrations/$f.sql
done
psql -d audit -f supabase/tests/audit/scenarios.sql
```

Every step in `scenarios.sql` says what should happen ("REFUSED" steps print an error):

| Steps | What it checks |
| --- | --- |
| 1–12 | Users can't set `has_insurance`, `status`, `total_price` or `hotel_id` directly; plain cancel and the SECURITY DEFINER paths (checkout, `cancel_reservation`) still work |
| 13–16 | `get_booked_nights` returns room ids and nights only, for signed-out visitors too |
| 17–22c | `save_listing` saves hotel and rooms in one transaction, updates rooms in place and never deletes a booked room |
| 23–27 | Owners can only upload, see and delete photos in their own folder of `listing-photos` |
