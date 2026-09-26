'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Book, ClaimResult } from '../lib/types';
import { bookDropDateKey } from '../lib/book-drops';
import BrandMark from './brand-mark';

const peso = new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP', maximumFractionDigits:0 });
const ordinal = (position:number) => {
  const mod100 = position % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${position}th`;
  return `${position}${position % 10 === 1 ? 'st' : position % 10 === 2 ? 'nd' : position % 10 === 3 ? 'rd' : 'th'}`;
};

const bookImages = (book:Book) => book.image_urls.length ? book.image_urls : book.image_url ? [book.image_url] : [];
const editionLabel = (book:Book) => book.condition.toLowerCase() === 'brand new' ? 'Brand-new edition' : 'Pre-loved edition';
const sellingPrice = (book:Book) => book.is_on_sale ? book.price-book.discount_amount : book.price;
const arrivalDateLabel = new Intl.DateTimeFormat('en-US', { timeZone:'Asia/Manila', month:'long', day:'numeric' });

const escapeReceiptText = (value:string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const shortenReceiptText = (value:string, limit = 39) => value.length > limit ? `${value.slice(0, limit - 1)}…` : value;

async function createReceiptPng(result: ClaimResult) {
  const width = 1080;
  const rowHeight = 92;
  const height = Math.max(1350, 1060 + result.items.length * rowHeight);
  const generatedAt = new Intl.DateTimeFormat('en-PH', { dateStyle:'medium', timeStyle:'short' }).format(new Date());
  const itemRows = result.items.map((item, index) => {
    const y = 612 + index * rowHeight;
    return `<g>
      <line x1="110" y1="${y - 54}" x2="970" y2="${y - 54}" stroke="#D7D0C3"/>
      <text x="120" y="${y + 18}" fill="#24352D" font-family="Georgia, serif" font-size="28">${escapeReceiptText(shortenReceiptText(item.title))}</text>
      <text x="950" y="${y + 18}" fill="#D87356" font-family="Arial, sans-serif" font-size="25" font-weight="700" text-anchor="end">${ordinal(item.position)} miner</text>
    </g>`;
  }).join('');
  const summaryY = 580 + result.items.length * rowHeight;
  const receiptSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="1080" height="${height}" fill="#F6F1E7"/>
    <rect x="52" y="52" width="976" height="${height - 104}" rx="24" fill="#FCFAF5" stroke="#D7D0C3" stroke-width="2"/>
    <g transform="translate(452 84) scale(2.75)" fill="none">
      <path d="M4 27.5c10.6-2.8 19.7-.9 28 5.7v18.1c-8.4-6.2-17.7-7.7-28-4.7V27.5Zm56 0c-10.6-2.8-19.7-.9-28 5.7v18.1c8.4-6.2 17.7-7.7 28-4.7V27.5Z" stroke="#24352D" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M7.5 32.2c8.7-1.7 16.2.1 22.4 5.2M56.5 32.2c-8.7-1.7-16.2.1-22.4 5.2M32 33.2v18.1M31.9 32.5c-3.7-5-5.4-10.9-4.6-17.2M32.1 32.5c4-4 6.4-8.6 7-13.9" stroke="#24352D" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M27.8 22.2c-4.3-.5-6.7-2.5-7.2-6 4.2.2 6.6 2.2 7.2 6Zm10.4 3c4.1-.8 6.3-3 6.5-6.4-4.1.5-6.3 2.6-6.5 6.4Z" stroke="#24352D" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M27.2 15.8c-3.5-1.9-4.8-4.5-3.7-7.7 3.5 1.7 4.8 4.3 3.7 7.7Zm12.2 3.4c3.6-1.6 5-4.1 4.2-7.4-3.6 1.4-5.1 3.9-4.2 7.4ZM27.4 8.5c-2.7-.9-3.2-3.9-.9-5.3 1.3-.8 3-.2 3.7 1.4.1-1.8 1.5-3 3-2.7 2.6.5 3 3.6.7 5.2 2.7-.2 4.2 2.5 2.6 4.5-1 1.2-2.8 1.2-4 0-.5 1.7-2.1 2.5-3.5 1.8-2.4-1.1-2.2-4.2.4-5.3" stroke="#D87356" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="31.8" cy="7.8" r="1.25" fill="#D87356"/>
    </g>
    <text x="540" y="280" fill="#24352D" font-family="Georgia, serif" font-size="46" font-weight="700" text-anchor="middle">The Second Chapter</text>
    <text x="540" y="330" fill="#6C7771" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="4" text-anchor="middle">CLAIM RECEIPT</text>
    <text x="540" y="407" fill="#24352D" font-family="Georgia, serif" font-size="43" text-anchor="middle">You’re on the miner list!</text>
    <text x="540" y="452" fill="#6C7771" font-family="Arial, sans-serif" font-size="20" text-anchor="middle">Save this receipt and send it to our Facebook page.</text>
    <rect x="110" y="490" width="860" height="${result.items.length * rowHeight + 68}" rx="12" fill="#F6F1E7"/>
    <text x="120" y="532" fill="#6C7771" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="2">YOUR BOOKS</text>
    ${itemRows}
    <line x1="110" y1="${summaryY - 22}" x2="970" y2="${summaryY - 22}" stroke="#D7D0C3"/>
    <text x="110" y="${summaryY + 65}" fill="#6C7771" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2">CLAIM CODE</text>
    <text x="110" y="${summaryY + 124}" fill="#24352D" font-family="Georgia, serif" font-size="48" font-weight="700" letter-spacing="4">${escapeReceiptText(result.code)}</text>
    <text x="970" y="${summaryY + 65}" fill="#6C7771" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2" text-anchor="end">BOOK SUBTOTAL</text>
    <text x="970" y="${summaryY + 124}" fill="#24352D" font-family="Georgia, serif" font-size="44" font-weight="700" text-anchor="end">${escapeReceiptText(peso.format(result.total))}</text>
    <text x="970" y="${summaryY + 157}" fill="#6C7771" font-family="Arial, sans-serif" font-size="17" text-anchor="end">Shipping fee not included</text>
    <rect x="110" y="${summaryY + 204}" width="860" height="116" rx="12" fill="#24352D"/>
    <text x="145" y="${summaryY + 250}" fill="#F6F1E7" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="2">SHIPPING RATES</text>
    <text x="145" y="${summaryY + 291}" fill="#F6F1E7" font-family="Arial, sans-serif" font-size="21">1 book  ·  ₱84</text>
    <text x="475" y="${summaryY + 291}" fill="#F6F1E7" font-family="Arial, sans-serif" font-size="21">2–3 books  ·  ₱134</text>
    <text x="790" y="${summaryY + 291}" fill="#F6F1E7" font-family="Arial, sans-serif" font-size="21">4–6  ·  ₱164</text>
    <text x="540" y="${height - 116}" fill="#7B8580" font-family="Arial, sans-serif" font-size="17" text-anchor="middle">Generated ${escapeReceiptText(generatedAt)} · Please keep your claim code.</text>
  </svg>`;

  const svgUrl = URL.createObjectURL(new Blob([receiptSvg], { type:'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = svgUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available.');
    context.drawImage(image, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create receipt image.')), 'image/png'));
    const pngUrl = URL.createObjectURL(png);
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `the-second-chapter-${result.code.toLowerCase().replaceAll(/[^a-z0-9-]/g, '-')}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export default function Storefront({ initialBooks,nextPublishAt,view='latest' }: { initialBooks:Book[];nextPublishAt:string|null;view?:'latest'|'all' }) {
  const router=useRouter();
  const books = initialBooks;
  const isLatestView=view==='latest';
  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ClaimResult|null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [detailBook, setDetailBook] = useState<Book|null>(null);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [searchQuery,setSearchQuery] = useState('');
  const chosen = useMemo(() => books.filter((book) => selected.includes(book.id)), [books, selected]);
  const saleBooks = useMemo(() => isLatestView?[]:books.filter((book) => book.is_on_sale&&book.status==='available'), [books,isLatestView]);
  const catalogBooks = useMemo(() => {
    if(!isLatestView)return books.filter((book) => !book.is_on_sale||book.status!=='available');
    const query=searchQuery.trim().toLocaleLowerCase();
    if(!query)return books;
    return books.filter((book) => `${book.title} ${book.author}`.toLocaleLowerCase().includes(query));
  }, [books,isLatestView,searchQuery]);
  const arrivalGroups = useMemo(() => {
    const groups = new Map<string,{label:string;books:Book[]}>();
    catalogBooks.forEach((book) => {
      const date=new Date(book.publish_at);
      const key=bookDropDateKey(book);
      const group=groups.get(key) ?? {label:arrivalDateLabel.format(date),books:[]};
      group.books.push(book);
      groups.set(key,group);
    });
    return Array.from(groups.entries()).map(([key,group]) => ({key,...group}));
  }, [catalogBooks]);

  useEffect(() => {
    if(!nextPublishAt)return;
    const remaining=new Date(nextPublishAt).getTime()-Date.now();
    const timeout=window.setTimeout(() => router.refresh(),Math.max(0,Math.min(remaining+250,2_147_483_647)));
    return () => window.clearTimeout(timeout);
  }, [nextPublishAt,router]);
  const total = chosen.reduce((sum, book) => sum + sellingPrice(book), 0);
  const available = books.filter((book) => book.status === 'available').length;

  useEffect(() => {
    if (!detailBook && !open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event:KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (detailBook) setDetailBook(null);
      else {
        setConfirmation(null);
        setError('');
        setReceiptError('');
        setOpen(false);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [detailBook, open]);

  function openClaimPanel() {
    setConfirmation(null);
    setError('');
    setOpen(true);
  }

  function closeClaimPanel() {
    setConfirmation(null);
    setError('');
    setReceiptError('');
    setOpen(false);
  }

  function openBook(book:Book) {
    setDetailBook(book);
    setDetailImageIndex(0);
  }

  function closeBook() {
    setDetailBook(null);
    setDetailImageIndex(0);
  }

  async function downloadReceipt() {
    if (!confirmation) return;
    setDownloadingReceipt(true);
    setReceiptError('');
    try {
      await createReceiptPng(confirmation);
    } catch {
      setReceiptError('Could not download the receipt. Please try again or take a screenshot.');
    } finally {
      setDownloadingReceipt(false);
    }
  }

  function toggle(id:number) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current,id]);
  }

  function changeDetailImage(imageCount:number, direction:number) {
    setDetailImageIndex((current) => (current + direction + imageCount) % imageCount);
  }

  function reviewClaimFromDetails() {
    closeBook();
    openClaimPanel();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch('/api/claim', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({...payload,bookIds:selected}) });
      const data = await response.json() as ClaimResult & {error?:string};
      if (!response.ok) throw new Error(data.error || 'Could not submit your claim.');
      setConfirmation(data);
      setSelected([]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Something went wrong.'); }
    finally { setSending(false); }
  }

  function renderBookCard(book:Book) {
    const image=bookImages(book)[0];
    const price=<span className={`book-preview-price ${book.is_on_sale?'on-sale':''}`}>{book.is_on_sale&&<s>{peso.format(book.price)}</s>}<b>{peso.format(sellingPrice(book))}</b></span>;
    return <article className={`book-card ${book.status !== 'available' ? 'unavailable' : ''}`} key={book.id}><button type="button" className={`book-cover book-cover-trigger ${book.tone} ${image?'has-cover-image':''}`} style={image?{backgroundImage:`url("${image.replaceAll('"','%22')}")`}:undefined} aria-label={`View ${book.title} details`} onClick={()=>openBook(book)}>{image?<span className="cover-preview-title"><span>{book.title}</span>{price}</span>:<><span className="cover-kicker">{editionLabel(book)}</span><strong>{book.title}</strong><span className="plain-cover-meta"><small>{book.author}</small>{price}</span></>}{book.is_on_sale&&book.status==='available'&&<span className="sale-stamp">Sale · {peso.format(book.discount_amount)} off</span>}{book.status!=='available'&&<span className="status-stamp">{book.status}</span>}<span className="view-book-hint">View book</span></button></article>;
  }

  return <main>
    <header className="site-header">
      <a className="brand" href={isLatestView?'#top':'/'} aria-label="The Second Chapter home"><BrandMark /><span>The Second Chapter</span></a>
      <nav>{isLatestView&&<a href="#how">How it works</a>}<a href={isLatestView?'#collection':'/'}>Latest drop</a><a href={isLatestView?'/all-books':'#collection'}>All books</a></nav>
      <button className="bag-button" onClick={openClaimPanel}>Claim list <span>{selected.length}</span></button>
    </header>

    {isLatestView?<section className="hero" id="top">
      <div className="hero-copy-block">
        <p className="eyebrow hero-eyebrow"><span aria-hidden="true" /> Curated new &amp; pre-loved books</p>
        <h1>A new favorite is<br /><em>waiting to be read.</em></h1>
        <p className="hero-copy">Discover thoughtfully chosen brand-new and pre-loved books, each ready to find a place on your shelf.</p>
        <div className="hero-actions">
          <a className="primary-button" href="#collection">Explore the latest drop <span aria-hidden="true">↓</span></a>
          <a className="secondary-button" href="#how">How claiming works <span aria-hidden="true">→</span></a>
        </div>
        <div className="hero-availability"><span className="pulse" /> <strong>{available}</strong> {available === 1 ? 'book is' : 'books are'} looking for a new home</div>
      </div>

      <div className="hero-art" aria-hidden="true">
        <span className="hero-art-label hero-art-label-top">Read</span>
        <div className="hero-sun" />
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />
        <div className="hero-emblem"><BrandMark /></div>
        <div className="hero-book hero-book-one" />
        <div className="hero-book hero-book-two" />
        <div className="hero-book hero-book-three" />
        <span className="hero-art-label hero-art-label-bottom">Rehome · Repeat</span>
      </div>
    </section>:<section className="past-drops-hero" id="top"><p className="eyebrow">The full collection</p><h1>All books.</h1><p>Browse every arrival in one place, including the latest drop and books currently on sale.</p><Link className="secondary-button" href="/">Back to the latest drop <span aria-hidden="true">→</span></Link></section>}

    {detailBook&&(() => {const images=bookImages(detailBook);const image=images[Math.min(detailImageIndex,Math.max(images.length-1,0))];return <div className="book-detail-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&closeBook()}><section className="book-detail-modal" role="dialog" aria-modal="true" aria-labelledby="book-detail-title"><button type="button" className="book-detail-close" aria-label="Close book details" onClick={closeBook}>×</button><div className="book-detail-gallery"><div className={`book-detail-image ${detailBook.tone} ${image?'has-image':''}`} style={image?{backgroundImage:`url("${image.replaceAll('"','%22')}")`}:undefined}>{!image&&<><span>{editionLabel(detailBook)}</span><strong>{detailBook.title}</strong><small>{detailBook.author}</small></>}{images.length>1&&<><button type="button" className="detail-arrow previous" aria-label="Previous book photo" onClick={()=>changeDetailImage(images.length,-1)}>‹</button><button type="button" className="detail-arrow next" aria-label="Next book photo" onClick={()=>changeDetailImage(images.length,1)}>›</button><span className="detail-image-count">{detailImageIndex+1} / {images.length}</span></>}</div>{images.length>1&&<div className="book-detail-thumbnails" aria-label="Choose a book photo">{images.map((photo,index)=><button type="button" key={photo} className={index===detailImageIndex?'active':undefined} aria-label={`View photo ${index+1}`} aria-pressed={index===detailImageIndex} style={{backgroundImage:`url("${photo.replaceAll('"','%22')}")`}} onClick={()=>setDetailImageIndex(index)}/>)}</div>}</div><div className="book-detail-copy"><p className="eyebrow">{editionLabel(detailBook)}</p><h2 id="book-detail-title">{detailBook.title}</h2><p className="book-detail-author">by {detailBook.author}</p><div className="book-detail-facts"><div><span>Price</span><strong className={detailBook.is_on_sale?'detail-sale-price':undefined}>{detailBook.is_on_sale&&<s>{peso.format(detailBook.price)}</s>}{peso.format(sellingPrice(detailBook))}</strong></div><div><span>Condition</span><strong>{detailBook.condition}</strong></div><div><span>Status</span><strong>{detailBook.status==='available'?'Open for miners':'Sold'}</strong></div></div>{detailBook.is_on_sale&&<p className="detail-sale-note">On sale · Save {peso.format(detailBook.discount_amount)}</p>}<div className="book-detail-description"><span>Description &amp; condition notes</span><p>{detailBook.description||'No additional condition notes were provided.'}</p></div><button type="button" className={`detail-claim-button ${selected.includes(detailBook.id)?'selected':''}`} disabled={detailBook.status!=='available'} onClick={()=>toggle(detailBook.id)}>{detailBook.status==='sold'?'Sold':selected.includes(detailBook.id)?'✓ Added to claim':'Add to claim'}</button>{selected.length>0&&<button type="button" className="detail-review-button" onClick={reviewClaimFromDetails}>Review claim list · {selected.length} {selected.length===1?'book':'books'}</button>}</div></section></div>})()}

    {isLatestView&&<section className="how" id="how"><p className="eyebrow">Know your place in line</p><h2>Claim in three easy steps.</h2><div className="steps"><div><span>01</span><h3>Pick your reads</h3><p>Add every book you want to one claim list.</p></div><div><span>02</span><h3>Join the miner list</h3><p>Submit your details to receive a position for each book.</p></div><div><span>03</span><h3>Message &amp; pay</h3><p>Send your claim receipt to The Second Chapter on Facebook and complete your payment within the agreed transaction period.</p></div></div><p className="payment-note"><strong>Payment-first policy</strong><span>Your claim is secured only after payment. If payment is not completed within the agreed transaction period, the seller will proceed to the next miner.</span></p></section>}

    <section className="collection" id="collection">
      <div className="section-heading"><div><p className="eyebrow">{isLatestView?'The latest drop':'The complete catalog'}</p><h2>{isLatestView?'Books looking for a new home':'Browse all books'}</h2></div><div className="section-heading-side"><p>{available} {available === 1 ? 'book' : 'books'} available</p><a href={isLatestView?'/all-books':'/'}>{isLatestView?'Browse all books':'View latest drop'} <span aria-hidden="true">→</span></a></div></div>
      {isLatestView&&<div className="collection-search"><span aria-hidden="true">⌕</span><input type="search" value={searchQuery} onChange={(event)=>setSearchQuery(event.target.value)} placeholder="Search by title or author" aria-label="Search the latest book arrival"/>{searchQuery&&<button type="button" onClick={()=>setSearchQuery('')}>Clear</button>}</div>}
      <div className="arrival-groups">
        {!isLatestView&&<section className="arrival-group sale-books-section"><div className="arrival-heading"><div><p className="eyebrow">Special prices</p><h3>On sale</h3></div><span>{saleBooks.length} {saleBooks.length===1?'book':'books'}</span></div>{saleBooks.length?<div className="book-grid">{saleBooks.map(renderBookCard)}</div>:<div className="empty-state">There are no books on sale right now.</div>}</section>}
        {arrivalGroups.map((group) => <section className="arrival-group" key={group.key}><div className="arrival-heading"><h3>{group.label} New Arrival</h3><span>{group.books.length} {group.books.length === 1 ? 'book' : 'books'}</span></div><div className="book-grid">{group.books.map(renderBookCard)}</div></section>)}
        {isLatestView&&books.length>0&&!arrivalGroups.length&&<div className="empty-state">No books match “{searchQuery.trim()}”.</div>}
        {!books.length&&<div className="empty-state">There are no books to display yet.</div>}
      </div>
    </section>

      <footer><div className="brand"><BrandMark /><span>The Second Chapter</span></div><p>Every book deserves another chapter.</p></footer>

    {selected.length > 0 && <button className="mobile-claim" onClick={openClaimPanel}>Review {selected.length} {selected.length === 1 ? 'book' : 'books'} · {peso.format(total)}</button>}

    {open && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeClaimPanel()}>
      <section className="claim-panel" role="dialog" aria-modal="true" aria-labelledby="claim-title">
        <button className="close-button" aria-label="Close claim list" onClick={closeClaimPanel}>×</button>
        {confirmation ? <div className="confirmation"><BrandMark /><p className="eyebrow">Claim received</p><h2 id="claim-title">You&apos;re on the miner list!</h2><p>Download your receipt, send it to The Second Chapter Facebook page, and complete payment within the agreed transaction period. Unpaid claims will be offered to the next miner.</p><div className="miner-positions">{confirmation.items.map((item) => <div key={item.book_id}><span>{item.title}</span><strong>{ordinal(item.position)} miner</strong></div>)}</div><strong>{confirmation.code}</strong><div className="confirmation-total"><span>Book subtotal · {peso.format(confirmation.total)}</span><small>Shipping fee not included</small></div><div className="shipping-rates"><span>Shipping rates</span><div><small>1 book</small><strong>₱84</strong></div><div><small>2–3 books</small><strong>₱134</strong></div><div><small>4–6 books</small><strong>₱164</strong></div></div>{receiptError && <p className="receipt-error" role="alert">{receiptError}</p>}<div className="confirmation-actions"><button type="button" className="receipt-button" disabled={downloadingReceipt} onClick={downloadReceipt}>{downloadingReceipt ? 'Preparing receipt…' : '↓ Download receipt'}</button><button type="button" className="continue-button" onClick={closeClaimPanel}>Continue browsing</button></div></div> : <>
          <p className="eyebrow">Your claim list</p><h2 id="claim-title">Almost yours.</h2><p className="claim-payment-note"><strong>Payment-first policy</strong><span>Your claim is secured only after payment. If payment is not completed within the agreed transaction period, the seller will proceed to the next miner.</span></p>
          {chosen.length ? <><div className="claim-items">{chosen.map((book) => <div key={book.id}><span><b>{book.title}</b><small>{book.author}{book.is_on_sale?' · Sale':''}</small></span><strong>{peso.format(sellingPrice(book))}</strong><button aria-label={`Remove ${book.title}`} onClick={() => toggle(book.id)}>×</button></div>)}</div><div className="claim-total"><span>Book subtotal <small>Shipping fee not included</small></span><strong>{peso.format(total)}</strong></div><div className="shipping-rates"><span>Shipping rates</span><div><small>1 book</small><strong>₱84</strong></div><div><small>2–3 books</small><strong>₱134</strong></div><div><small>4–6 books</small><strong>₱164</strong></div></div>
          <form onSubmit={submit}><div className="form-grid"><label>Full name<input name="name" required maxLength={80} autoComplete="name" /></label><label>Mobile number<input name="phone" required maxLength={30} inputMode="tel" autoComplete="tel" /></label></div><label>Facebook profile or Messenger name<input name="facebook" required maxLength={200} placeholder="Link or exact profile name" /></label><label>Delivery method<select name="delivery" required><option value="">Choose one</option><option>Pickup</option><option>Maxim / Angkas</option><option>J&amp;T</option></select></label><label>Delivery address <small>(if applicable)</small><textarea name="address" rows={2} maxLength={300} /></label><label>Notes <small>(optional)</small><textarea name="notes" rows={2} maxLength={300} placeholder="Preferred pickup point, rider details, etc." /></label><label className="claim-disclaimer"><input name="termsAccepted" type="checkbox" required /><span>I understand that claims cannot be cancelled, I accept each book&apos;s stated condition, and no refunds or returns are allowed once an order has shipped.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="submit-claim" disabled={sending}>{sending ? 'Joining the miner list…' : `Submit claim · ${peso.format(total)}`}</button><p className="fine-print">Book subtotal excludes shipping. Submitting adds you to each book&apos;s miner queue; claims stay open until the seller marks a book sold.</p></form></> : <div className="empty-claim"><p>Your claim list is empty.</p><button onClick={closeClaimPanel}>Browse books</button></div>}
        </>}
      </section>
    </div>}
  </main>;
}
