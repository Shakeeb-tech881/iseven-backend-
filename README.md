# iSeven Mobile — Backend

Next.js 14 App Router API for the iSeven catalogue site.
Catalogue + WhatsApp inquiry model: no cart, no checkout, no payments.

Verified: `next build` passes clean on Next 16.3.0 / React 19,
`npm audit` reports 0 vulnerabilities.

**Next 15+ note:** dynamic route params are a Promise. Handlers use the
`RouteCtx` helper from `lib/response.ts`:

```ts
export const GET = route(async (req, ctx: RouteCtx<{ id: string }>) => {
  const { id } = await ctx.params;
});
```

Do not run `npm audit fix --force` — it is not needed, and on a future
advisory it may jump a major version and break these signatures.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run dev
```

Generate the JWT secret with:

```bash
openssl rand -base64 48
```

Before starting, run `iseven_schema.sql` then `iseven_seed.sql` in the
Supabase SQL editor, and create a **public** Storage bucket named
`products`.

## Environment

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page. Safe for the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | same page. **Server only.** Bypasses RLS. |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `WHATSAPP_NUMBER` | digits only: `94771234567` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` in dev |
| `SUPABASE_STORAGE_BUCKET` | `products` |

## Endpoints

### Public

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Ping from cron so the free project never pauses |
| GET | `/api/products` | Filter, search, sort, paginate |
| GET | `/api/products/[slug]` | Full detail + prebuilt `whatsappLinks` per variant |
| GET | `/api/brands` | |
| GET | `/api/categories` | |
| GET | `/api/banners` | Respects `startsAt` / `endsAt` |
| GET | `/api/installment-plans?amount=289900` | Returns monthly figures |
| POST | `/api/inquiries` | Logs a WhatsApp click. 30/min per IP. |
| POST | `/api/leads` | Callback form. 5/min per IP + honeypot. |

`/api/products` query parameters: `brand`, `category`, `condition`,
`minPrice`, `maxPrice`, `inStock`, `featured`, `search`, `sort`
(`popular` `newest` `price_asc` `price_desc` `name_asc`), `page`, `limit`.

### Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | Backfills guest leads matching the phone |
| POST | `/api/auth/login` | 10 attempts / 15 min per IP |
| POST | `/api/auth/refresh` | Rotates the refresh token |
| POST | `/api/auth/logout` | Revokes the refresh token |
| GET | `/api/auth/me` | Profile + inquiry history |

Access token: JWT, 15 minutes. Refresh token: opaque, 30 days, stored
as a SHA-256 hash. Send `Authorization: Bearer <accessToken>`.

### Admin (STAFF or ADMIN)

| Method | Path |
|---|---|
| GET, POST | `/api/admin/products` |
| GET, PUT, DELETE | `/api/admin/products/[id]` |
| GET | `/api/admin/leads` |
| PATCH | `/api/admin/leads/[id]` |
| POST | `/api/admin/upload` |
| GET, POST | `/api/admin/brands` |
| GET, POST | `/api/admin/categories` |

`DELETE /api/admin/products/[id]` is a soft delete (sets `isActive`
false) and requires ADMIN. Add `?hard=true` to remove the row.

## Response format

```json
{ "data": { } }
{ "data": [ ], "meta": { "page": 1, "limit": 20, "total": 42,
                         "totalPages": 3, "hasMore": true } }
{ "error": { "code": "VALIDATION_ERROR", "message": "...",
             "details": [{ "field": "phone", "message": "..." }] } }
```

## Creating your first admin

Register normally, then promote in the SQL editor:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

`role` is never read from the request body, so this is the only way an
admin account can be created.

## Decisions worth knowing

**Prices are `numeric` in Postgres**, which PostgREST returns as strings
to avoid float precision loss. Every price passes through `num()` in
`lib/mappers.ts`. If a price ever arrives at the frontend as
`"289900.00"`, a mapper was skipped.

**Prices for inquiries and leads are read from the database**, never
taken from the request body. Otherwise anyone can submit fake figures
and your demand data becomes worthless.

**No transactions.** PostgREST has no multi-statement transactions, so
`POST /api/admin/products` deletes the product manually if variant or
image insertion fails. Without that you get a product with no variants,
which silently disappears from the listing view.

**Rate limiting is in-process.** Fine on a single long-running server.
On serverless each instance keeps its own counter, so swap the Map in
`lib/ratelimit.ts` for Upstash Redis if you deploy to Vercel or
Cloudflare and abuse becomes a problem.

**Login timing.** A failed lookup still runs a bcrypt comparison against
a dummy hash, so response time does not reveal whether an email is
registered.

## Not built yet

- OTP send and verify (the `OtpToken` table and helpers exist; the SMS
  or email provider is not wired up)
- Password reset flow
- Admin endpoints for banners and installment plans
- Scheduled cleanup of expired refresh tokens

## Keep-alive

Free Supabase projects pause after 7 days without requests. Add a
GitHub Action:

```yaml
name: keep-alive
on:
  schedule: [{ cron: '0 6 */3 * *' }]
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS "${{ secrets.SITE_URL }}/api/health"
```

---

## The site

This project now serves the storefront as well as the API.

| Route | What it is |
|---|---|
| `/` | Home — hero, banners, featured, brands, new arrivals |
| `/products` | Listing with search, brand/condition/stock filters, sort, paging |
| `/product/[slug]` | Detail — gallery, variant picker, EMI, WhatsApp, callback form |
| `/contact` | WhatsApp, warranty and delivery info |

Pages read Postgres directly through `src/lib/data.ts` rather than
fetching this app's own `/api` routes — a server component calling its
own HTTP endpoint adds a hop for no benefit. The `/api` routes are
unchanged and still serve external clients.

Writes go through the real endpoints: the WhatsApp button posts to
`/api/inquiries` before redirecting, and the callback form posts to
`/api/leads`.

### Design notes

Liquid glass: every surface is translucent over a drifting colour field,
because glass with nothing behind it is just a grey box. Prices are set
in JetBrains Mono with tabular figures so variant prices align when
compared. WhatsApp green is used for nothing except the inquiry button,
so green always means "talk to a human".

The signature element is the floating action bar on product pages
(mobile), which tracks the selected variant and always shows the live
price.

### Resilience

`safe()` in `data.ts` wraps homepage sections, and
`generateStaticParams` catches its own errors. A paused free-tier
Supabase project degrades individual sections instead of 500ing the
site or failing the build.

### Note on fonts

Fonts load via `next/font/google` and are fetched at build time, so the
first `npm run build` needs internet access.

---

## Admin panel

`/admin` — sign in with a STAFF or ADMIN account.

| Route | What it does |
|---|---|
| `/admin/login` | Sign in |
| `/admin` | Counts, most-asked-about phones, latest callbacks |
| `/admin/products` | Searchable list, live/hidden/sold-out status |
| `/admin/products/new` | Add a phone |
| `/admin/products/[id]` | Edit, including variants and photos |
| `/admin/leads` | Callback queue with status and notes |

Create the first admin by registering on the site, then:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

`role` is never read from a request body, so this is the only route in.

### Notes

Photos are resized to 1400px and converted to WebP in the browser before
upload. Phone-camera originals are 4MB+ and the free Supabase tier gives
1GB, so this is the difference between roughly 5,000 images and 250.

Access tokens live in `localStorage` and refresh automatically on the
first 401, so staff are not signed out mid-edit. That is a deliberate
trade-off — the API uses Bearer tokens, so cookie sessions would mean
rewriting the auth layer. The panel renders no user-supplied HTML, so
the XSS surface is small; if you later show customer messages as rich
text, move to httpOnly cookies first.

Deleting a product is a soft delete. It disappears from the shop but
inquiry history that references it stays intact.

## Design

Frosted glass on black. Panels are translucent films with a specular
highlight along the top edge, and the hero lays the featured phone's own
photo behind everything — blurred and dimmed — so the glass has something
real to refract instead of flat black. Admin surfaces use `.solid`
instead, since they sit on plain black and should read as panels.

Monochrome black and white until you touch it. Every interactive state —
hover, focus, selected, active — turns banana green (`--acid`), so green
consistently means "this responds to you". Prices are set in JetBrains
Mono with tabular figures so variant prices align when compared.

---

## Migration 002 — run this before using the new admin pages

`migrations/002_admin_control.sql` in the Supabase SQL Editor. It adds:

- **`Setting`** — hero configuration as key/value jsonb, so a new setting
  never needs another migration
- **`Attribute` / `AttributeValue`** — the storage, RAM and colour lists
  staff pick from, seeded with sensible defaults

Safe to re-run.

## Admin pages

| Route | Controls |
|---|---|
| `/admin` | Dashboard — counts, most-asked-about phones, latest leads |
| `/admin/products` | Products, variants, photos, photo-to-colour links |
| `/admin/leads` | Callback queue |
| `/admin/hero` | Hero image, headline, buttons, stats |
| `/admin/banners` | Homepage carousel |
| `/admin/brands` | Brands, with logo and banner upload |
| `/admin/categories` | Categories, with image upload |
| `/admin/attributes` | Storage / RAM / colour option lists |
| `/admin/plans` | Bank instalment rates |

### Why option lists exist

Without them every product form is free text: one person types `256GB`,
another types `256 GB`, and the storage filter quietly splits in two.
Defining the list once fixes it at the source. The product form uses a
datalist, so staff pick from the list but can still type something new.

### Photo-to-colour

On the product form, each photo can be assigned to a colour variant.
Assigned photos show only when that colour is selected; photos left on
"All colours" always show. Colours only appear in that dropdown after
the product has been saved once — a photo cannot reference a variant
that has no id yet.

### Deletes

Brands and categories use `ON DELETE RESTRICT`, so deleting one that
still has products fails with a readable message rather than orphaning
stock. Switch it off instead. Banners and plans delete outright since
nothing references them. Products soft-delete, preserving inquiry
history.

---

## Migration 003 — clear placeholder images

`migrations/003_clear_placeholders.sql`.

The seed data used `placehold.co`, which serves SVG. Next.js will not
optimise remote SVG because it can carry scripts, so those URLs throw at
render time.

Rather than enabling `dangerouslyAllowSVG` and weakening image security
for the sake of fake data, `isUsableImage()` in `lib/format.ts` treats
SVG and placehold.co URLs as "no image", and the data layer filters them
out. Banners without a usable image disappear; products fall back to the
"Photo coming" tile. Run migration 003 to delete the dead rows properly.

---

## Migration 004 — hero blur controls

`migrations/004_hero_blur.sql`. Adds `blur` and `dim` to the hero
setting, exposed as sliders at `/admin/hero`. Blur 0 shows the photo
sharp; 60 turns it into a wash of colour.

## Which product appears in the hero

The featured product with the highest **homepage priority**
(`Product.popularity`, 0–100). Tick "Feature on the homepage" on a
product and the priority field appears.

Note: before this build the product form sent `popularity: 0` on every
save, so editing a product silently dropped it out of the hero. Fixed —
the form now loads and preserves the real value.

---

## Migration 005 — shop settings and navigation

`migrations/005_shop_settings.sql`. Adds two setting keys:

- **`shop`** — name, WhatsApp number, email, address, hours, footer text,
  social links. These were environment variables, which meant changing
  the shop's phone number needed a developer and a redeploy.
- **`nav`** — whether categories appear in the header, how many, plus any
  extra links.

## Navigation is no longer hardcoded

The header used to list Home / Phones / Accessories / Contact in code, so
adding a category left it invisible to customers. It now builds from live
categories, controlled at `/admin/settings`.

## Complete CRUD

| Entity | Create | Read | Update | Delete | Notes |
|---|---|---|---|---|---|
| Products | ✓ | ✓ | ✓ | ✓ soft | + duplicate with variants and images |
| Variants | ✓ | ✓ | ✓ | ✓ | inside the product form |
| Product images | ✓ | ✓ | ✓ | ✓ | + assign to a colour |
| Brands | ✓ | ✓ | ✓ | ✓ | logo and banner upload |
| Categories | ✓ | ✓ | ✓ | ✓ | image upload |
| Banners | ✓ | ✓ | ✓ | ✓ | |
| Instalment plans | ✓ | ✓ | ✓ | ✓ | |
| Option lists | ✓ | ✓ | ✓ | ✓ | storage / RAM / colour |
| Leads | — | ✓ | ✓ | ✓ hard | + CSV export |
| Inquiries | auto | ✓ | — | — | append-only by design |
| Staff | — | ✓ | ✓ | — | promote from registered users |
| Hero / shop / nav | — | ✓ | ✓ | — | settings |

Leads delete hard rather than soft: they hold a name and phone number, so
a PDPA removal request has to actually remove the record.

Inquiries are append-only — an analytics log you can edit is not evidence
of anything.

Staff cannot be created from the panel. People register on the shop and
are promoted at `/admin/staff`. An admin panel that mints its own
accounts is a far bigger prize if someone ever gets in. Admins also
cannot demote or disable themselves, since that is unrecoverable without
database access. Removing someone's access revokes their refresh tokens
immediately rather than waiting for expiry.

## New admin pages

| Route | Controls |
|---|---|
| `/admin/inquiries` | WhatsApp click analytics — top products, by day, by source |
| `/admin/settings` | Shop details, footer, social links, menu |
| `/admin/staff` | Roles and access |

---

## Migration 007 — category banners

`migrations/007_category_banners.sql`. Adds `Banner.categoryId`.

- Null → the banner shows on the homepage
- Set → it shows on that category's listing page
- Several rows with the same target become a slideshow

Banners cascade-delete with their category: a banner attached to nothing
would be invisible and confusing to debug.

## Banner slideshow

`BannerSlider` replaces the old side-scrolling rail. Full-bleed,
`clamp(380px, 62vh, 620px)` tall, auto-advancing every 5 seconds.

It pauses on hover, on keyboard focus, and when the browser tab is
hidden — a carousel that moves while someone is reading a slide or
tabbing through its link is hostile. With `prefers-reduced-motion` it
does not auto-advance at all, but the arrows and dots still work so
nothing becomes unreachable. Inactive slides are `inert`, which keeps
keyboard users off links they cannot see.

Recommended image size: about **2400 × 1000**, dark enough that white
text stays readable over it.

## Brand banners

Now rendered. Upload one under Brands, then visit
`/products?brand=samsung` — it becomes the page header. Previously the
field existed and was uploaded to but never displayed anywhere.

## Fonts

- **Poppins** — headings. Geometric and strong in bold, and it sits under
  the brush-script logo without competing with it.
- **Inter** — body and UI. Built for screens; tabular numbers keep
  variant prices aligned.
- **JetBrains Mono** — prices, SKUs, labels.
- **Playfair Display** — loaded as `--font-serif` and applied via the
  `.serif` class on the closing homepage section only.

A note on Playfair: it is a beautiful face, but the logo is already the
loud element on the page. Running Playfair across every heading would
give two competing personalities. It is wired up and available — add
`serif` to any heading's class list if you want more of it.

## Logo

`public/logo.png` (header and footer lockup), `public/logo-mark.png`
(square, for social avatars), `public/icon.png` (favicon). All generated
from the supplied artwork with the transparent padding trimmed, so the
logo can be sized by its own height.

---

## Migration 008 / 009

- **008** — sets the registered shop name.
- **009** — adds `shopLabel` to the nav setting.

## Navigation

Menu order: Home, All phones, then up to `maxCategories` categories,
then any extra links.

The catalogue link is always present. With only category links, a
customer could browse Smartphones or Tablets but never reach the full
list, and any category past `maxCategories` was unreachable from the
menu entirely. The label is editable at `/admin/settings`.

The current page is matched on path **and** query string. Every category
link points at `/products`, so comparing the path alone lit up all of
them at once.

## Banners — where each one appears

| Setting | Appears |
|---|---|
| Where it shows: **Homepage** | Full-bleed slider under the header on `/` |
| Where it shows: **<Category> page** | Same slider on `/products?category=<slug>` |

Several with the same target rotate every 5 seconds. Nothing shows until
you add one — the slider hides itself when empty rather than leaving a
gap.

Brand art is separate: upload it under Brands, and it becomes the header
on `/products?brand=<slug>`.

---

## Migration 010 — wording and price typography

`migrations/010_labels.sql`.

- "All phones" → "All Products". The shop sells power banks and
  accessories too, so the old label under-described it.
- "Agent warranty" → "Trusted Warranty" on the homepage.

Prices moved from JetBrains Mono to Poppins so they read as headline
numbers rather than spec-sheet fields. `tabular-nums` is kept, which is
the part that matters — it stops digits shifting when a customer
compares 256GB against 512GB in a column.

Mono did not disappear: it moved to a `.code` class used on SKUs, slugs
and admin identifiers, where reading character by character is the point.

The closing homepage block uses Playfair Display at a wider measure. It
is the one place the shop speaks in its own voice rather than listing
specifications, so a slower read suits it.

See `migrations/README.md` for the full run order.
