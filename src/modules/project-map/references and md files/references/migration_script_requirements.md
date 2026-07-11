That's actually a better approach for setup/master tables.

Here's the updated standard:

---

# Database Migration Standards

Going forward, all database migration scripts must follow these standards.

## 1. Always Use Safe Migrations

Every migration should be **idempotent**, meaning it can be executed multiple times without causing errors or creating duplicate objects.

Whenever possible, use:

* `CREATE TABLE IF NOT EXISTS`
* `CREATE INDEX IF NOT EXISTS`
* `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
* `DROP COLUMN IF EXISTS`
* `DROP CONSTRAINT IF EXISTS`
* `CREATE OR REPLACE VIEW`

The goal is to prevent duplicate:

* Tables
* Columns
* Constraints
* Indexes
* Views
* Relationships

A migration should always be safe to rerun.

---

## 2. Upsert Seed/Master Data

For setup tables and master data, **never skip existing rows**.

Instead, use an **UPSERT** approach:

* If the record **does not exist**, insert it.
* If the record **already exists**, update it with the latest values.

Use PostgreSQL's `INSERT ... ON CONFLICT (...) DO UPDATE` whenever possible.

Do **not** use:

* `ON CONFLICT DO NOTHING`
* `INSERT ... WHERE NOT EXISTS`

for setup/master data, because those approaches leave outdated records unchanged.

The goal is to keep setup tables synchronized with the latest application defaults while avoiding duplicate rows.

Example:

```sql
INSERT INTO public.ohd_s_pricing_constants
(
    constant_name,
    constant_value,
    description,
    display_order
)
VALUES
(
    'Header Seal',
    0.95,
    'Per inch',
    1
)
ON CONFLICT (constant_name)
DO UPDATE
SET
    constant_value = EXCLUDED.constant_value,
    description    = EXCLUDED.description,
    display_order  = EXCLUDED.display_order;
```

This ensures that:

* New records are inserted.
* Existing records are updated.
* Duplicate rows are never created.

---

## 3. Include Detailed Execution Logs

Every migration must produce detailed execution logs that appear in the Supabase SQL Editor Results pane. SQL comments (`--`) are documentation only and will not appear in query results.

**Migration logging must use executable PostgreSQL output rather than comments.**

Each migration should:

* Use `RAISE NOTICE` for step-by-step execution logs.
* Use `IF EXISTS` / `IF NOT EXISTS` checks before schema changes.
* Use `INSERT ... ON CONFLICT DO UPDATE` for setup/master data.
* Return a final `SELECT` summary showing migration results.

### Migration Information

At the beginning of every migration, use `RAISE NOTICE` to display:

* Migration number
* Migration title
* Target schema

Example:

```sql
DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 003: Create Pricing Constants Setup Table';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;
```

---

### Step-by-Step Operations

Before every operation, use `RAISE NOTICE` to log what is about to happen.

Example:

```sql
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/4] Checking if table "ohd_s_pricing_constants" exists...';
END $$;
```

---

### Object Status

After every operation, use `RAISE NOTICE` to report the outcome.

Examples:

```sql
RAISE NOTICE '✔ Table created or already exists.';
RAISE NOTICE '✔ Column added successfully.';
RAISE NOTICE '✔ Column already exists. Skipping.';
RAISE NOTICE '✔ Constraint created.';
RAISE NOTICE '✔ Index created.';
```

---

### Row Data Synchronization

For every inserted or updated record, use `RAISE NOTICE` to display what happened.

Example:

```sql
DO $$
DECLARE
    v_old_value numeric(18,2);
    v_new_value numeric(18,2);
BEGIN
    -- Check if record exists
    SELECT constant_value INTO v_old_value
    FROM ohd_s_pricing_constants
    WHERE constant_name = 'Header Seal';

    IF FOUND THEN
        -- Update existing
        UPDATE ohd_s_pricing_constants
        SET constant_value = 0.95
        WHERE constant_name = 'Header Seal';

        RAISE NOTICE '• Header Seal: UPDATED (old: %, new: 0.95)', v_old_value;
    ELSE
        -- Insert new
        INSERT INTO ohd_s_pricing_constants (constant_name, constant_value, description, display_order)
        VALUES ('Header Seal', 0.95, 'Per inch', 1);

        RAISE NOTICE '• Header Seal: INSERTED';
    END IF;
END $$;
```

---

### Final Summary

Every migration must end with a `SELECT` statement that returns a summary row. This summary appears in the Supabase SQL Editor Results pane.

Example:

```sql
SELECT
    '003' AS migration,
    'Create Pricing Constants Setup Table' AS name,
    1 AS tables_created,
    0 AS tables_updated,
    1 AS columns_added,
    0 AS columns_skipped,
    3 AS rows_inserted,
    0 AS rows_updated,
    0 AS rows_unchanged,
    0 AS warnings,
    0 AS errors,
    'SUCCESS' AS status,
    now() AS finished_at,
    EXTRACT(EPOCH FROM (now() - now()))::numeric(10,2) AS duration_seconds;
```

**Result in Supabase SQL Editor:**

| migration | name                                    | tables_created | tables_updated | columns_added | columns_skipped | rows_inserted | rows_updated | rows_unchanged | warnings | errors | status  | finished_at          | duration_seconds |
| --------- | --------------------------------------- | -------------- | -------------- | ------------- | --------------- | ------------- | ------------ | -------------- | -------- | ------ | ------- | ------------------- | ---------------- |
| 003       | Create Pricing Constants Setup Table   | 1              | 0              | 1             | 0               | 3             | 0            | 0              | 0        | 0      | SUCCESS | 2026-07-05 10:15:48 | 0.00             |

---

## Goal

Every migration should be **self-documenting and executable**. By running the migration and viewing the Results pane, you should be able to determine:

* Which migration was executed (via `RAISE NOTICE` output).
* Which objects were checked (via `RAISE NOTICE` output).
* Which objects were created (via `RAISE NOTICE` output).
* Which objects already existed (via `RAISE NOTICE` output).
* Which columns were added (via `RAISE NOTICE` output).
* Which constraints and indexes were created or skipped (via `RAISE NOTICE` output).
* Which setup/master data was inserted, updated, or left unchanged (via `RAISE NOTICE` output).
* Whether any warnings or errors occurred (via `RAISE NOTICE` output).
* The overall success of the migration and a complete summary of all changes applied (via final `SELECT` summary).

This approach makes deployments, troubleshooting, and production audits significantly easier, especially as the number of migrations grows. The final `SELECT` summary provides a machine-readable audit trail that can be logged or reviewed in the Supabase SQL Editor Results pane.

---

## 4. Migration Goal

Every migration should be:

* Safe to execute multiple times.
* Idempotent.
* Self-documenting through execution logs.
* Free from duplicate tables, columns, constraints, indexes, and row data.
* Able to keep setup/master data synchronized by **updating existing records instead of skipping them**.
* Easy to audit and troubleshoot during deployment.

These standards should be applied to **all future database migrations** unless there is a specific technical reason not to.