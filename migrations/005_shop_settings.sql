-- =====================================================================
-- Migration 005 — shop settings and navigation
--
-- Moves the shop's own details out of environment variables and into
-- the database, so staff can change the WhatsApp number or address
-- without a developer and a redeploy.
-- Safe to re-run.
-- =====================================================================

INSERT INTO "Setting" (key, value) VALUES (
  'shop',
  '{
    "name": "iSeven Mobile",
    "whatsapp": "94777655565",
    "email": null,
    "addressLine": "Colombo, Sri Lanka",
    "mapUrl": null,
    "hours": "Mon–Sat, 9am–7pm",
    "footerBlurb": "Genuine smartphones and accessories in Colombo. Browse the stock, then message us — you will get a person who knows what is actually on the shelf.",
    "facebook": null,
    "instagram": null,
    "tiktok": null
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Navigation. showCategories pulls live categories into the header, so
-- adding a category adds a menu item with no code change.
INSERT INTO "Setting" (key, value) VALUES (
  'nav',
  '{
    "showCategories": true,
    "maxCategories": 4,
    "extra": [{ "label": "Contact", "href": "/contact" }]
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

SELECT key, jsonb_pretty(value) FROM "Setting" ORDER BY key;
