import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getProductFeedEntries, safe } from '@/lib/data';
import type { Condition } from '@/lib/types';

// Google re-fetches this on its own schedule; an hour keeps it well ahead
// of that without hammering the DB on every crawl.
export const revalidate = 3600;

const CONDITION_MAP: Record<Condition, 'new' | 'used' | 'refurbished'> = {
  NEW: 'new',
  USED: 'used',
  REFURBISHED: 'refurbished',
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, ']]&gt;')}]]>`;
}

export async function GET() {
  const site = env.NEXT_PUBLIC_SITE_URL;
  const products = await safe(() => getProductFeedEntries(), [], 'product feed');

  const items = products
    .map((p) => {
      const link = `${site}/product/${p.slug}`;
      const additionalImages = p.additionalImages
        .map((url) => `    <g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`)
        .join('\n');

      return [
        '  <item>',
        `    <g:id>${escapeXml(p.slug)}</g:id>`,
        `    <g:title>${cdata(p.name)}</g:title>`,
        p.description ? `    <g:description>${cdata(p.description)}</g:description>` : null,
        `    <link>${escapeXml(link)}</link>`,
        `    <g:image_link>${escapeXml(p.image as string)}</g:image_link>`,
        additionalImages || null,
        `    <g:availability>${p.availability}</g:availability>`,
        `    <g:price>${(p.price as number).toFixed(2)} LKR</g:price>`,
        `    <g:brand>${cdata(p.brandName)}</g:brand>`,
        `    <g:condition>${CONDITION_MAP[p.condition] ?? 'new'}</g:condition>`,
        // We don't hold real GTINs or manufacturer part numbers, so this
        // tells Google that plainly rather than guessing at one.
        '    <g:identifier_exists>no</g:identifier_exists>',
        '  </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
  <title>iSeven Mobiles Product Feed</title>
  <link>${site}</link>
  <description>Live product feed for iSeven Mobiles</description>
${items}
</channel>
</rss>
`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Same hour-long freshness window as the sitemap.
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
