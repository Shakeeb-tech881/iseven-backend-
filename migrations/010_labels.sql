-- =====================================================================
-- Migration 010 — wording
--
-- "All phones" excluded the accessories you also sell, so the menu label
-- becomes "All Products". Editable at /admin/settings.
-- Safe to re-run.
-- =====================================================================

UPDATE "Setting"
SET value = jsonb_set(value, '{shopLabel}', '"All Products"'::jsonb),
    "updatedAt" = now()
WHERE key = 'nav'
  AND COALESCE(value->>'shopLabel', 'All phones') = 'All phones';

SELECT value->>'shopLabel' AS menu_label FROM "Setting" WHERE key = 'nav';
