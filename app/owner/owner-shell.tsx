'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
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
  const [menuOpen,setMenuOpen]=useState(false);

  useEffect(() => {
    if(!menuOpen)return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const closeOnEscape=(event:KeyboardEvent) => {
      if(event.key==='Escape')setMenuOpen(false);
    };
    document.addEventListener('keydown',closeOnEscape);
    return () => {
      document.body.style.overflow=previousOverflow;
      document.removeEventListener('keydown',closeOnEscape);
    };
  },[menuOpen]);

  return <main className="dashboard">
    <button className="dashboard-menu-button" type="button" aria-label="Open seller navigation" aria-controls="seller-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><span/><span/><span/></button>
    {menuOpen&&<button className="dashboard-sidebar-backdrop" type="button" aria-label="Close seller navigation" onClick={() => setMenuOpen(false)}/>}
    <aside className={`dashboard-sidebar${menuOpen?' open':''}`} id="seller-navigation">
      <button className="dashboard-menu-close" type="button" aria-label="Close seller navigation" onClick={() => setMenuOpen(false)}>×</button>
      <Link href="/" className="brand" onClick={() => setMenuOpen(false)}><BrandMark /><span>The Second Chapter</span></Link>
      <nav aria-label="Seller dashboard">
        <Link href="/owner/claims" className={active === 'claims' ? 'active' : undefined} onClick={() => setMenuOpen(false)}>Claims</Link>
        <Link href="/owner/inventory" className={active === 'inventory' ? 'active' : undefined} onClick={() => setMenuOpen(false)}>Inventory</Link>
        <Link href="/owner/updates" className={active === 'updates' ? 'active' : undefined} onClick={() => setMenuOpen(false)}>Updates</Link>
      </nav>
      <div><small>{email}</small><form action="/auth/logout" method="post"><button className="link-button">Sign out</button></form></div>
    </aside>
    <div className="dashboard-main">
      <header><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><Link href="/" target="_blank">View storefront ↗</Link></header>
      {children}
    </div>
  </main>;
}
