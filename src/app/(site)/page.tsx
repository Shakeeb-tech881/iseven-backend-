import Link from 'next/link';
import { getBanners, getBrandsWithCounts, getHero, getProducts, getSpotlight, safe, HERO_FALLBACK } from '@/lib/data';
import ProductTile from '@/components/ProductTile';
import BannerSlider from '@/components/BannerSlider';
import { ArrowIcon, ShieldIcon } from '@/components/Icons';
import { formatLKR } from '@/lib/format';

// No ISR on the homepage. Staff change the hero or feature a different
// phone and expect to see it on the next reload — a 60 second cache made
// every edit look like it had failed. The queries are cheap and indexed.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const empty = { products: [], total: 0, page: 1, totalPages: 1 };

  const [hero_, featured, latest, banners, brands] = await Promise.all([
    safe(() => getHero(), HERO_FALLBACK, 'hero'),
    safe(() => getProducts({ featured: true, limit: 4 }), empty, 'featured'),
    safe(() => getProducts({ sort: 'newest', limit: 8 }), empty, 'latest'),
    safe(() => getBanners(), [], 'banners'),
    safe(() => getBrandsWithCounts(), [], 'brands'),
  ]);

  const hero = await safe(
    () => getSpotlight(hero_.spotlightProductId),
    featured.products[0] ?? latest.products[0] ?? null,
    'spotlight',
  );

  // Custom upload wins; otherwise fall back to the featured phone's photo.
  const heroImage = hero_.mode === 'custom' ? hero_.image : hero?.primaryImage ?? null;

  return (
    <>
      {/* ---------- hero ---------- */}
      <section className="hero">
        {heroImage && (
          <div
            className="hero-bleed"
            aria-hidden="true"
            style={{
              ['--hero-blur' as string]: `${hero_.blur}px`,
              ['--hero-dim' as string]: hero_.dim / 100,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt="" />
          </div>
        )}
        <div className="wrap hero-grid">
          <div className="hero-copy">
            {hero_.eyebrow && <p className="eyebrow rise-in">{hero_.eyebrow}</p>}
            <h1 className="display h1 rise-in" style={{ ["--d" as string]: "0.06s" }}>
              {hero_.title.split('\n').map((line, i) => (
                <span key={i}>{i > 0 && <br />}{line}</span>
              ))}
            </h1>
            {hero_.subtitle && (
              <p className="lede rise-in" style={{ marginTop: 22, ["--d" as string]: "0.14s" }}>
                {hero_.subtitle}
              </p>
            )}

            <div className="hero-cta rise-in" style={{ ["--d" as string]: "0.22s" }}>
              <Link href="/products" className="btn">
                Browse the stock <ArrowIcon />
              </Link>
              <Link href="/products?condition=USED" className="btn">Pre-owned</Link>
            </div>

            {hero_.statsEnabled && (
              <div className="stats rise-in" style={{ ["--d" as string]: "0.3s" }}>
                {([1, 2, 3] as const).map((n) => {
                  const value = hero_[`stat${n}Value` as const];
                  const label = hero_[`stat${n}Label` as const];
                  if (!value) return null;
                  return (
                    <div className="stat" key={n}>
                      <div className="stat-n">{value}</div>
                      <div className="stat-l">{label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {hero && (
            <div>
              <Link href={`/product/${hero.slug}`} className="glass glass-hover float" style={{
                display: 'block', padding: 22, textDecoration: 'none',
              }}>
                <p className="eyebrow" style={{ marginBottom: 10 }}>{hero_.spotlightLabel || 'Most asked about'}</p>
                <div className="tile-media" style={{ borderRadius: 16, aspectRatio: '1' }}
                     data-empty={hero.primaryImage ? 'false' : 'true'}>
                  {hero.primaryImage
                    ? /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={hero.primaryImage} alt={hero.name} />
                    : <span>Photo coming</span>}
                </div>
                <h2 className="display h3" style={{ marginTop: 16 }}>{hero.name}</h2>
                <div className="between" style={{ marginTop: 8 }}>
                  <span className="price price-lg">{formatLKR(hero.fromPrice)}</span>
                  {hero.hasDiscount && (
                    <span className="price-was">{formatLKR(hero.fromOriginalPrice)}</span>
                  )}
                </div>
              </Link>

              <div className="trust">
                <span className="trust-item"><ShieldIcon size={18} /> Trusted Warranty</span>
                <span className="trust-item"><span className="dot" /> Island-wide</span>
                <span className="trust-item"><span className="dot" /> Trade-in welcome</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- banners ---------- */}
      {banners.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <BannerSlider banners={banners} />
        </div>
      )}

      {/* ---------- featured ---------- */}
      {featured.products.length > 0 && (
        <section className="wrap section">
          <div className="between" style={{ marginBottom: 26 }}>
            <div>
              <p className="eyebrow">Handpicked</p>
              <h2 className="display h2">The ones people ask for</h2>
            </div>
            <Link href="/products" className="btn btn-sm">View all <ArrowIcon size={14} /></Link>
          </div>
          <div className="grid-products">
            {featured.products.map((p) => <ProductTile key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ---------- brands ---------- */}
      {brands.length > 0 && (
        <section className="wrap section-tight">
          <p className="eyebrow">Browse by brand</p>
          <div className="rail" style={{ marginTop: 14 }}>
            {brands.map((b) => (
              <Link key={b.slug} href={`/products?brand=${b.slug}`}
                    className="glass glass-hover" style={{
                      padding: '18px 26px', minWidth: 150, textAlign: 'center',
                    }}>
                <div className="display h3">{b.name}</div>
                <div className="faint tiny">{b.count} {b.count === 1 ? 'model' : 'models'}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- latest ---------- */}
      {latest.products.length > 0 && (
        <section className="wrap section">
          <p className="eyebrow">Just arrived</p>
          <h2 className="display h2" style={{ marginBottom: 26 }}>New in the shop</h2>
          <div className="grid-products">
            {latest.products.map((p) => <ProductTile key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ---------- closer ---------- */}
      <section className="wrap section">
        <div className="glass" style={{ padding: 'clamp(28px, 6vw, 52px)', textAlign: 'center' }}>
          <h2 className="display serif h2" style={{ marginBottom: 14 }}>Not sure which one?</h2>
          <p className="closer-copy">
            Tell us your budget and what you actually use your phone for. We will send two or
            three honest options — including the cheaper one, if that is the right answer.
          </p>
          <div className="hero-cta" style={{ justifyContent: 'center' }}>
            <Link href="/products" className="btn">See all products <ArrowIcon /></Link>
            <Link href="/contact" className="btn">Ask us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
