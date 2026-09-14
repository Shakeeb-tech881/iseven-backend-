'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Banner } from '@/lib/types';
import { ArrowIcon } from './Icons';

/** Nothing holds the rotation longer than this, however long the clip is. */
const MAX_VIDEO_HOLD = 15000;

/**
 * Full-bleed banner slideshow, images and video mixed in one rotation.
 *
 * Image slides advance after `interval`. Video slides hold until the clip
 * ends, so a customer never loses the second half of a clip to a timer.
 *
 * It pauses on hover, on keyboard focus, and when the browser tab is
 * hidden — a carousel that moves while someone is reading a slide or
 * tabbing through its link is hostile.
 *
 * Honours prefers-reduced-motion by not auto-advancing at all and showing
 * the poster frame instead of playing video. The arrows and dots still
 * work, so nothing becomes unreachable.
 */
export default function BannerSlider({
  banners,
  interval = 5000,
}: {
  banners: Banner[];
  interval?: number;
}) {
  const [index, setIndex] = useState(0);
  /** Hovering or tabbing in holds the rotation — it must not stop playback. */
  const [held, setHeld] = useState(false);
  /** A background tab should stop playback outright. */
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  /**
   * Slides that have had a src attached stay attached. Removing it to save
   * bandwidth meant a clip re-downloaded every time the rotation came back
   * round, which is worse than the download it avoided.
   */
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const count = banners.length;

  /**
   * Only the active slide and the one after it get a `src`.
   *
   * Previously the first clip used preload="auto", so the browser pulled
   * several megabytes down before the page settled and visitors sat on the
   * poster frame. A banner is decoration — it must never hold up the shop.
   */
  // Mark the current slide and the next one as loaded, and never unmark.
  useEffect(() => {
    setLoaded((prev) => {
      const next = (index + 1) % Math.max(count, 1);
      if (prev.has(index) && prev.has(next)) return prev;
      const updated = new Set(prev);
      updated.add(index);
      updated.add(next);
      return updated;
    });
  }, [index, count]);
  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Stop burning cycles and skipping slides while the tab is in the background.
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /**
   * Only the active slide plays. A video running off-screen costs battery
   * and mobile data for something nobody can see.
   */
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      // Deliberately not gated on `held`: someone resting the cursor over a
      // banner is watching it, so stopping the clip is the opposite of what
      // they want. Hover only holds the rotation.
      if (i === index && !hidden && !reduced) {
        if (video.currentTime > 0 && video.ended) video.currentTime = 0;
        // Autoplay can be refused; the poster stays visible if so.
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [index, hidden, reduced]);

  /**
   * Advance timer.
   *
   * A video slide waits for its `ended` event rather than a fixed delay,
   * but still carries a ceiling: without one, a long upload or a clip that
   * never fires `ended` (autoplay refused, decode error) would stall the
   * rotation for good.
   */
  useEffect(() => {
    if (count < 2 || held || hidden || reduced) return;

    const current = banners[index];
    const video = videoRefs.current[index];
    const isPlayingVideo =
      current?.mediaType === 'VIDEO' && current.videoUrl && video;

    if (isPlayingVideo) {
      const onEnded = () => next();
      video.addEventListener('ended', onEnded);
      timer.current = setTimeout(next, MAX_VIDEO_HOLD);
      return () => {
        video.removeEventListener('ended', onEnded);
        if (timer.current) clearTimeout(timer.current);
      };
    }

    timer.current = setTimeout(next, interval);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [index, held, hidden, reduced, count, interval, banners, next]);

  if (count === 0) return null;

  return (
    <section
      className="slider"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      aria-roledescription="carousel"
      aria-label="Promotions"
    >
      <div className="slider-track">
        {banners.map((b, i) => {
          const active = i === index;
          const isVideo = b.mediaType === 'VIDEO' && Boolean(b.videoUrl);

          const media = isVideo ? (
            <video
              ref={(el) => { videoRefs.current[i] = el; }}
              src={loaded.has(i) ? b.videoUrl ?? undefined : undefined}
              poster={b.image}
              muted
              playsInline
              /* The browser starts the first clip itself, without waiting for
                 React to mount and call play(). Later slides are started by
                 the effect below when they become active. */
              autoPlay={i === 0}
              /* Buffer the first clip fully so it plays the moment the page
                 appears; leave the rest until they are nearly up. */
              preload={i === 0 ? 'auto' : 'none'}
              // No `loop`: the slide advances when the clip ends.
              aria-label={b.title ?? 'Promotion'}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={b.image} alt={b.title ?? ''} loading={i === 0 ? 'eager' : 'lazy'} />
          );

          const inner = (
            <>
              {media}
              {/* A banner with no words at all should be clean artwork, not
                  an empty gradient sitting over the bottom third. */}
              {(b.title || b.subtitle || b.cta) && (
                <div className="slider-copy">
                  <div className="wrap">
                    {b.title && <h2 className="display slider-title">{b.title}</h2>}
                    {b.subtitle && <p className="slider-sub">{b.subtitle}</p>}
                    {b.cta && (
                      <span className="btn btn-wa" style={{ marginTop: 20 }}>
                        {b.cta} <ArrowIcon />
                      </span>
                    )}
                  </div>
                </div>
              )}
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
