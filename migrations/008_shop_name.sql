-- =====================================================================
-- Migration 008 — registered shop name
--
-- The footer copyright line and page titles should carry the registered
-- name. Editable any time at /admin/settings.
-- Safe to re-run.
-- =====================================================================

UPDATE "Setting"
SET value = jsonb_set(value, '{name}', '"iSeven Mobile Private Limited"'::jsonb),
    "updatedAt" = now()
WHERE key = 'shop';

SELECT value->>'name' AS shop_name FROM "Setting" WHERE key = 'shop';
