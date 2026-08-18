-- =====================================================================
-- Migration 007 — category banners
--
-- A banner can now belong to a category. Null means it shows on the
-- homepage; set means it shows on that category's listing page.
-- Several banners with the same target become a slideshow.
-- Safe to re-run.
-- =====================================================================

ALTER TABLE "Banner"
  ADD COLUMN IF NOT EXISTS "categoryId" text
  REFERENCES "Category"(id) ON DELETE CASCADE;

-- Deleting a category takes its banners with it: a banner with no
-- category and no homepage flag would be invisible and confusing.

CREATE INDEX IF NOT EXISTS "Banner_categoryId_idx"
  ON "Banner" ("categoryId", "sortOrder") WHERE "isActive";

CREATE INDEX IF NOT EXISTS "Banner_home_idx"
  ON "Banner" ("sortOrder") WHERE "isActive" AND "categoryId" IS NULL;

SELECT
  COALESCE(c.name, 'Homepage') AS shows_on,
  count(b.id) AS banners
FROM "Banner" b
LEFT JOIN "Category" c ON c.id = b."categoryId"
GROUP BY c.name
ORDER BY 1;
