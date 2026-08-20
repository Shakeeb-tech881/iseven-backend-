'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { MenuIcon, WhatsAppIcon } from './Icons';

interface NavLink { href: string; label: string }

export default function Header({
  whatsappNumber,
  links,
  shopName = 'iSeven Mobile',
}: {
  whatsappNumber: string;
  links: NavLink[];
  shopName?: string;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const params = useSearchParams();

  /**
   * Every category link points at /products with a different query, so
   * comparing the path alone marked all of them as current and drew the
   * green underline under every one. The query has to be part of the
   * comparison.
   */
  function isCurrent(href: string): boolean {
    const [linkPath, linkQuery] = href.split('?');
    if (linkPath !== path) return false;

    if (!linkQuery) {
      // A bare link is only current when no filter is narrowing the page —
      // otherwise "Shop" would stay lit while viewing a single category.
      return !params.get('category') && !params.get('brand');
    }

    const wanted = new URLSearchParams(linkQuery);
    for (const [key, value] of wanted.entries()) {
      if (params.get(key) !== value) return false;
    }
    return true;
  }

  return (
    <header className="masthead">
      <nav className="nav">
        <Link href="/" className="logo" onClick={() => setOpen(false)} aria-label={shopName}>
          <Image
            src="/logo.png"
            alt={shopName}
            width={520}
            height={173}
            priority
          />
        </Link>

        <div className="nav-links">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="nav-link"
              aria-current={isCurrent(l.href) ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="nav-tail">
          <a
            className="btn btn-wa btn-sm"
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon size={15} />
            <span>Chat</span>
          </a>
          <button
            className="burger"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="drawer">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={isCurrent(l.href) ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
