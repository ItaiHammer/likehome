# F13 migration test (local Postgres only)

Reproduces audit finding F13 (users granting themselves refund points) on a throwaway local
database that mirrors the live tables, RLS policies, triggers and functions (copied read-only
from the LikeHome project on 2026-10-25). Never run this against the shared Supabase project.

```bash
createdb f13
psql -d f13 -f supabase/tests/f13/setup.sql
psql -d f13 -f supabase/tests/f13/scenarios.sql        # before: steps A and B succeed, balance ends at 100000
dropdb f13 && createdb f13 && psql -d f13 -f supabase/tests/f13/setup.sql
psql -d f13 -f supabase/migrations/20261025_f13_lock_down_transactions.sql
psql -d f13 -f supabase/tests/f13/scenarios.sql        # after: A, B, D, F refused; checkout charge 202.00; balance 20200
```

Step G still refunds as points because users can set `has_insurance` on their own reservation
(reservations UPDATE policy). That is a separate follow-up; the refund is now capped at what was
actually charged.
