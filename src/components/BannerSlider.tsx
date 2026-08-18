'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Banner } from '@/lib/types';
import { ArrowIcon } from './Icons';

/**
 * Full-bleed banner slideshow.
 *
 * Advances every 5 seconds, but pauses on hover, on focus, and when the
 * tab is hidden — a carousel that keeps moving while someone is reading
 * a slide or tabbing through its link is hostile.
 *
 * Honours prefers-reduced-motion by not auto-advancing at all. The
 * arrows and dots still work, so nothing becomes unreachable.
 */
export default function BannerSlider({
  banners,
  interval = 5000,
}: {
  banners: Banner[];
  interval?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = banners.length;
  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [count, paused, interval]);

  // Stop burning cycles and skipping slides while the tab is in the background.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (count === 0) return null;

  return (
    <section
      className="slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Promotions"
    >
      <div className="slider-track">
        {banners.map((b, i) => {
          const active = i === index;
          const inner = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt={b.title} loading={i === 0 ? 'eager' : 'lazy'} />
              <div className="slider-copy">
                <div className="wrap">
                  <h2 className="display slider-title">{b.title}</h2>
                  {b.subtitle && <p className="slider-sub">{b.subtitle}</p>}
                  {b.cta && (
                    <span className="btn btn-wa" style={{ marginTop: 20 }}>
                      {b.cta} <ArrowIcon />
                    </span>
                  )}
                </div>
              </div>
            </>
          );

          return (
            <div
              key={b.id}
              className="slide"
              data-on={active}
              aria-hidden={!active}
              /* Inert slides must not be tabbable, or keyboard users land on
                 links they cannot see. React 19 takes a real boolean here —
                 an empty string is read as false. */
              inert={!active}
            >
              {b.link ? <Link href={b.link} className="slide-link">{inner}</Link> : inner}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button className="slider-arrow slider-prev" onClick={() => go(index - 1)}
                  aria-label="Previous slide">‹</button>
          <button className="slider-arrow slider-next" onClick={() => go(index + 1)}
                  aria-label="Next slide">›</button>

          <div className="slider-dots">
            {banners.map((b, i) => (
              <button
                key={b.id}
                className="slider-dot"
                data-on={i === index}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
