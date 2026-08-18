# Migrations

Run in the Supabase SQL Editor, in numeric order. All are safe to re-run.

| # | What it does |
|---|---|
| `iseven_schema.sql` | Base tables, indexes, view, RLS. **Run first.** |
| `iseven_seed.sql` | Sample data. Optional — skip if adding real stock. |
| `002` | `Setting`, `Attribute`, `AttributeValue` (hero config, option lists) |
| `003` | Deletes the `placehold.co` placeholder images |
| `004` | Hero blur and darkness controls |
| `005` | Shop details and navigation settings |
| `006` | Explicit spotlight product for the hero card |
| `007` | Category banners (`Banner.categoryId`) |
| `008` | Registered shop name |
| `009` | Always-present catalogue link |
| `010` | "All phones" → "All Products" |

If you are starting fresh, run the schema then 002 through 010 in order.
If you already have the site running, run whichever you have not yet
applied — each prints a verification query at the end.
