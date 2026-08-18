'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getToken } from '@/lib/admin-client';

const NAV: ({ href: string; label: string } | { group: string })[] = [
  { href: '/admin', label: 'Dashboard' },
  { group: 'Selling' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/inquiries', label: 'WhatsApp clicks' },
  { group: 'Appearance' },
  { href: '/admin/hero', label: 'Hero section' },
  { href: '/admin/banners', label: 'Banners' },
  { group: 'Catalogue' },
  { href: '/admin/brands', label: 'Brands' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/attributes', label: 'Option lists' },
  { href: '/admin/plans', label: 'Instalments' },
  { group: 'Shop' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/staff', label: 'Staff' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const isLogin = path === '/admin/login';

  useEffect(() => {
    if (isLogin) { setReady(true); return; }
    if (!getToken()) router.replace('/admin/login');
    else setReady(true);
  }, [isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!ready) return null;

  return (
    <div className="adm">
      <aside className="adm-side">
        <Link href="/admin" className="logo" style={{ marginBottom: 8 }}>
          <span className="logo-mark">i7</span>
          <span style={{ fontSize: '0.9rem' }}>Admin</span>
        </Link>

        {NAV.map((n, i) =>
          'group' in n ? (
            <span key={`g${i}`} className="adm-group">{n.group}</span>
          ) : (
            <Link
              key={n.href}
              href={n.href}
              className="adm-nav"
              data-on={n.href === '/admin' ? path === n.href : path.startsWith(n.href)}
            >
              {n.label}
            </Link>
          ),
        )}

        <div style={{ marginTop: 'auto', display: 'flex', gap: 6 }}>
          <Link href="/" className="adm-nav" target="_blank">View shop ↗</Link>
          <button
            className="adm-nav"
            onClick={() => { clearSession(); router.replace('/admin/login'); }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="adm-main">{children}</div>
    </div>
  );
}
