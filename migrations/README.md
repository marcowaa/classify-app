Migrations added on 2025-12-11

Files:
- 2025-12-11__add_notifications_status_resolved_at.sql
  - Adds `status` (varchar, default 'pending', NOT NULL) and `resolved_at` (timestamp, nullable)
  - Purpose: allow lifecycle tracking for `notifications` (pending | resolved | read)

- 2025-12-11__make_products_parent_id_nullable.sql
  - Alters `products.parent_id` to DROP NOT NULL
  - Purpose: support admin/global products where `parent_id` is NULL

How to run (examples)

Using psql (recommended for manual control):

1) Ensure `DATABASE_URL` is set in your environment, or replace it directly in the command.

```bash
psql "$DATABASE_URL" -f migrations/2025-12-11__add_notifications_status_resolved_at.sql
psql "$DATABASE_URL" -f migrations/2025-12-11__make_products_parent_id_nullable.sql
```

Using drizzle-kit (if you prefer):

- If you maintain migrations with `drizzle-kit`, you can copy these SQL contents into your drizzle migration workflow or use a generated migration and paste SQL there. Example (conceptual):

```bash
# generate a migration and then edit the .sql file created by drizzle-kit
npx drizzle-kit generate:migration --out migrations
# then paste the SQL from these files into the generated migration file, and run:
npx drizzle-kit push --connection "$DATABASE_URL"
```

Rollback notes

- The SQL files include commented `-- Revert` statements showing how to undo the changes, but be careful: reverting `parent_id` to NOT NULL requires ensuring no rows have NULL parent_id.

Testing locally

- Run the SQL against a local development database first (not production). Confirm your app starts and migrations produce no errors.

Do not run any of these commands automatically from this repository. You asked that I NOT execute `db:push` or run migrations on your live DB; please run the commands above on the target server when you're ready.

If you want, I can also:
- Create drizzle-style migration JS/TS files instead of raw SQL.
- Add a small script `scripts/run-migrations.sh` that runs the above commands (kept disabled by default).
- Generate TypeScript types for the added columns (if you prefer explicit zod schemas).
 
Drizzle-style migrations added:

- `migrations/20251211090000_add_notifications_status_resolved_at/migration.sql`
  - Adds `status` (varchar, default 'pending', NOT NULL) and `resolved_at` (timestamp, nullable)
  - Rollback: `migrations/20251211090000_add_notifications_status_resolved_at/rollback.sql`

- `migrations/20251211090001_make_products_parent_id_nullable/migration.sql`
  - Drops NOT NULL constraint on `products.parent_id` to allow NULL (global products)
  - Rollback: `migrations/20251211090001_make_products_parent_id_nullable/rollback.sql`

How to run these Drizzle migration files manually (psql):

```bash
# run notifications migration
psql "$DATABASE_URL" -f migrations/20251211090000_add_notifications_status_resolved_at/migration.sql

# run products migration
psql "$DATABASE_URL" -f migrations/20251211090001_make_products_parent_id_nullable/migration.sql
```

To rollback manually, run the corresponding `rollback.sql` files (careful, dropping columns or setting NOT NULL may lose data):

```bash
psql "$DATABASE_URL" -f migrations/20251211090000_add_notifications_status_resolved_at/rollback.sql
psql "$DATABASE_URL" -f migrations/20251211090001_make_products_parent_id_nullable/rollback.sql
```

Migrations added on 2026-01-28

Files:
- 2026-01-28__otp_codes_add_columns.sql
  - Alters `otp_codes.code` to text for hashed OTPs
  - Adds `status`, `attempts`, `device_hash`, `ip_address`

- 2026-01-28__otp_request_logs.sql
  - Creates `otp_request_logs` for OTP rate limiting

- 2026-01-28__otp_indexes.sql
  - Adds indexes for `otp_codes` and `otp_request_logs`

Migrations added on 2026-02-08

Drizzle-style migrations added:

- `migrations/20260208150000_task_completion_hardening/migration.sql`
  - Adds points ledger, outbox events, task attempts summary, monitoring counters
  - Adds unique partial index on task_results for correct answers
- `migrations/20260208150000_task_completion_hardening/rollback.sql`
  - Drops tables and indexes added by the migration
- `migrations/20260208193000_points_ledger_backfill/migration.sql`
  - Backfills `points_ledger` from existing `children.total_points` when ledger is empty
- `migrations/20260208193000_points_ledger_backfill/rollback.sql`
  - Removes entries with reason `MIGRATION_BACKFILL`