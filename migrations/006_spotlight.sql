-- =====================================================================
-- Migration 006 — pick the spotlight product explicitly
--
-- The hero card used to show whichever featured product had the highest
-- popularity. That worked, but there was no way to see or change it from
-- the admin panel. Now it can be chosen directly; null keeps the old
-- automatic behaviour.
-- Safe to re-run.
-- =====================================================================

UPDATE "Setting"
SET value = value
      || jsonb_build_object('spotlightProductId', value->'spotlightProductId')
      || jsonb_build_object('spotlightLabel',
           COALESCE(value->>'spotlightLabel', 'Most asked about')),
    "updatedAt" = now()
WHERE key = 'hero';

-- Ensure the key exists rather than being absent
UPDATE "Setting"
SET value = jsonb_set(value, '{spotlightProductId}', 'null'::jsonb)
WHERE key = 'hero' AND NOT (value ? 'spotlightProductId');

SELECT jsonb_pretty(value) FROM "Setting" WHERE key = 'hero';
