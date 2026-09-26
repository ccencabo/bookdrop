import Link from 'next/link';
import type { ReactNode } from 'react';
import BrandMark from '../brand-mark';

export default function OwnerShell({
  email,
  active,
  eyebrow,
  title,
  children,
}: {
  email: string;
  active: 'claims' | 'inventory' | 'updates';
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return <main className="dashboard">
    <aside className="dashboard-sidebar">
      <Link href="/" className="brand"><BrandMark /><span>The Second Chapter</span></Link>
      <nav>
        <Link href="/owner/claims" className={active === 'claims' ? 'active' : undefined}>Claims</Link>
        <Link href="/owner/inventory" className={active === 'inventory' ? 'active' : undefined}>Inventory</Link>
        <Link href="/owner/updates" className={active === 'updates' ? 'active' : undefined}>Updates</Link>
      </nav>
      <div><small>{email}</small><form action="/auth/logout" method="post"><button className="link-button">Sign out</button></form></div>
    </aside>
    <div className="dashboard-main">
      <header><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><Link href="/" target="_blank">View storefront ↗</Link></header>
      {children}
    </div>
  </main>;
}
