-- =====================================================================
-- iSeven Mobile — Migration 002: full admin control
--
-- Run this in the Supabase SQL Editor AFTER iseven_schema.sql.
-- Safe to re-run: everything is IF NOT EXISTS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- SETTINGS — hero image, homepage copy, shop details.
--
-- One row per setting, value as jsonb. A key/value table rather than a
-- wide "settings" row so adding a new setting never needs a migration.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Setting" (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Default hero. mode 'featured' derives the backdrop from the featured
-- product's photo; mode 'custom' uses the uploaded image below.
INSERT INTO "Setting" (key, value) VALUES (
  'hero',
  '{
    "mode": "featured",
    "image": null,
    "eyebrow": "Colombo · Since 2016",
    "title": "Real phones.\nReal prices.\nOne message away.",
    "subtitle": "Every phone here is in the shop, warranty-backed, and priced as listed. Pick a model and message us — you will get a person who knows the stock.",
    "primaryLabel": "Browse the stock",
    "primaryHref": "/products",
    "secondaryLabel": "Pre-owned",
    "secondaryHref": "/products?condition=USED",
    "statsEnabled": true,
    "stat1Value": "9k+",  "stat1Label": "Phones sold",
    "stat2Value": "12+",  "stat2Label": "Brands stocked",
    "stat3Value": "4.9",  "stat3Label": "Average rating"
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------
-- ATTRIBUTES — the reusable option lists staff pick from.
--
-- Without this, every product form is free text: someone types "256GB",
-- someone else types "256 GB", and the storage filter quietly splits in
-- two. Defining the list once fixes that at the source.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Attribute" (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        text NOT NULL,                 -- "Storage"
  slug        text NOT NULL UNIQUE,          -- "storage"
  kind        text NOT NULL DEFAULT 'OTHER', -- STORAGE | RAM | COLOR | OTHER
  "sortOrder" integer NOT NULL DEFAULT 0,
  "isActive"  boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attribute_kind_valid CHECK (kind IN ('STORAGE', 'RAM', 'COLOR', 'OTHER'))
);

CREATE TABLE IF NOT EXISTS "AttributeValue" (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "attributeId" text NOT NULL REFERENCES "Attribute"(id) ON DELETE CASCADE,
  label         text NOT NULL,   -- "256GB" or "Titanium Black"
  hex           text,            -- only for COLOR attributes
  "sortOrder"   integer NOT NULL DEFAULT 0,
  CONSTRAINT attrvalue_unique UNIQUE ("attributeId", label)
);

CREATE INDEX IF NOT EXISTS "AttributeValue_attributeId_idx"
  ON "AttributeValue" ("attributeId", "sortOrder");

-- Seed the three lists a phone shop always needs.
INSERT INTO "Attribute" (id, name, slug, kind, "sortOrder") VALUES
  ('attr_storage', 'Storage', 'storage', 'STORAGE', 1),
  ('attr_ram',     'RAM',     'ram',     'RAM',     2),
  ('attr_color',   'Colour',  'colour',  'COLOR',   3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "AttributeValue" ("attributeId", label, "sortOrder") VALUES
  ('attr_storage', '64GB',  1), ('attr_storage', '128GB', 2),
  ('attr_storage', '256GB', 3), ('attr_storage', '512GB', 4),
  ('attr_storage', '1TB',   5),
  ('attr_ram', '4GB',  1), ('attr_ram', '6GB',  2), ('attr_ram', '8GB', 3),
  ('attr_ram', '12GB', 4), ('attr_ram', '16GB', 5)
ON CONFLICT ("attributeId", label) DO NOTHING;

INSERT INTO "AttributeValue" ("attributeId", label, hex, "sortOrder") VALUES
  ('attr_color', 'Black',   '#1a1a1a', 1),
  ('attr_color', 'White',   '#f2f2f2', 2),
  ('attr_color', 'Silver',  '#c8c8cc', 3),
  ('attr_color', 'Gold',    '#d4bd8a', 4),
  ('attr_color', 'Blue',    '#3a5f9e', 5),
  ('attr_color', 'Green',   '#4a7a5c', 6),
  ('attr_color', 'Purple',  '#7a6f9b', 7),
  ('attr_color', 'Red',     '#a33a3a', 8)
ON CONFLICT ("attributeId", label) DO NOTHING;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

ALTER TABLE "Setting"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attribute"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttributeValue" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read settings" ON "Setting";
CREATE POLICY "public read settings" ON "Setting" FOR SELECT USING (true);

DROP POLICY IF EXISTS "public read attributes" ON "Attribute";
CREATE POLICY "public read attributes" ON "Attribute" FOR SELECT USING ("isActive");

DROP POLICY IF EXISTS "public read attribute values" ON "AttributeValue";
CREATE POLICY "public read attribute values" ON "AttributeValue" FOR SELECT USING (true);

-- Writes go through the server with the service_role key, which bypasses
-- RLS. No public write policies, deliberately.

-- ---------------------------------------------------------------------
-- VERIFY
-- ---------------------------------------------------------------------

SELECT key, jsonb_pretty(value) FROM "Setting";

SELECT a.name, a.kind, count(v.id) AS values
FROM "Attribute" a
LEFT JOIN "AttributeValue" v ON v."attributeId" = a.id
GROUP BY a.id, a.name, a.kind, a."sortOrder"
ORDER BY a."sortOrder";
