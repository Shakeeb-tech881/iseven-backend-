-- =====================================================================
-- Migration 009 — always-present catalogue link
--
-- The menu previously showed only Home plus a few categories, so there
-- was no way to reach the full product list, and any category beyond
-- maxCategories was unreachable from the menu entirely.
-- Safe to re-run.
-- =====================================================================

UPDATE "Setting"
SET value = value || jsonb_build_object(
      'shopLabel', COALESCE(value->>'shopLabel', 'All phones')),
    "updatedAt" = now()
WHERE key = 'nav';

SELECT jsonb_pretty(value) FROM "Setting" WHERE key = 'nav';
