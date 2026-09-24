import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

/**
 * /admin and /api are never worth a crawl budget. The query-param
 * disallows target views that are pure duplicates of a page already in
 * the sitemap (paging, sorting, searching) — brand and category are left
 * open because those are real landing pages we want indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/*?*sort=',
        '/*?*page=',
        '/*?*search=',
        '/*?*inStock=',
        '/*?*condition=',
      ],
    },
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
