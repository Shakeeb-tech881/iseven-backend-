-- =====================================================================
-- Migration 003 — remove seeded placeholder images
--
-- The seed data pointed at placehold.co, which serves SVG. Next.js
-- refuses to optimise remote SVG because it can carry scripts, so those
-- URLs error at render time. The app now ignores them, but they are
-- still dead rows — clear them out and upload real photos in /admin.
-- =====================================================================

-- What is about to go
SELECT 'Banner' AS table, id, image FROM "Banner" WHERE image LIKE '%placehold.co%'
UNION ALL
SELECT 'ProductImage', id, url FROM "ProductImage" WHERE url LIKE '%placehold.co%';

DELETE FROM "ProductImage" WHERE url LIKE '%placehold.co%';
DELETE FROM "Banner"       WHERE image LIKE '%placehold.co%';

-- Clear a placeholder hero if one was saved
UPDATE "Setting"
SET value = jsonb_set(value, '{image}', 'null'::jsonb)
WHERE key = 'hero' AND value->>'image' LIKE '%placehold.co%';

-- Should return nothing
SELECT count(*) AS remaining_placeholders
FROM (
  SELECT id FROM "Banner" WHERE image LIKE '%placehold.co%'
  UNION ALL
  SELECT id FROM "ProductImage" WHERE url LIKE '%placehold.co%'
) x;
