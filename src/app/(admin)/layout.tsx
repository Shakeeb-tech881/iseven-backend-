import type { Metadata } from 'next';

// admin/layout.tsx is a 'use client' component (it reads the session and
// redirects), and a client component can't export metadata — so this one
// lives a level up in the route group purely to keep the admin panel out
// of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
