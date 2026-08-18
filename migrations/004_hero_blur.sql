-- =====================================================================
-- Migration 004 — hero blur and darkness controls
--
-- Adds two keys to the existing hero setting so the backdrop can be
-- tuned from /admin/hero instead of by editing CSS.
--   blur 0  = photo shown sharp
--   blur 60 = pure wash of colour
-- Safe to re-run.
-- =====================================================================

UPDATE "Setting"
SET value = value
      || jsonb_build_object('blur', COALESCE((value->>'blur')::int, 30))
      || jsonb_build_object('dim',  COALESCE((value->>'dim')::int, 45)),
    "updatedAt" = now()
WHERE key = 'hero';

SELECT jsonb_pretty(value) FROM "Setting" WHERE key = 'hero';
