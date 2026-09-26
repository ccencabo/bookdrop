'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { Book, ClaimResult } from '../lib/types';
import BrandMark from './brand-mark';

const peso = new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP', maximumFractionDigits:0 });
const ordinal = (position:number) => {
  const mod100 = position % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${position}th`;
  return `${position}${position % 10 === 1 ? 'st' : position % 10 === 2 ? 'nd' : position % 10 === 3 ? 'rd' : 'th'}`;
};

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

export default function Storefront({ initialBooks }: { initialBooks: Book[] }) {
  const books = initialBooks;
  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ClaimResult|null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const chosen = useMemo(() => books.filter((book) => selected.includes(book.id)), [books, selected]);
  const total = chosen.reduce((sum, book) => sum + book.price, 0);
  const available = books.filter((book) => book.status === 'available').length;

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

  return <main>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="The Second Chapter home"><BrandMark /><span>The Second Chapter</span></a>
      <nav><a href="#how">How it works</a></nav>
      <button className="bag-button" onClick={openClaimPanel}>Claim list <span>{selected.length}</span></button>
    </header>

    <section className="hero" id="top">
      <p className="eyebrow">Fresh off the shelf · New drop</p>
      <h1>Good stories deserve<br /><em>another reader.</em></h1>
      <p className="hero-copy">Pre-loved books, carefully checked and ready for their next chapter. Join a book&apos;s miner list before it is sold.</p>
      <a className="primary-button" href="#collection">Browse the new drop <span aria-hidden="true">↓</span></a>
      <div className="drop-note"><span className="pulse" /> New arrivals are live</div>
    </section>

    <section className="collection" id="collection">
      <div className="section-heading"><div><p className="eyebrow">The latest drop</p><h2>Books looking for a new home</h2></div><p>{available} {available === 1 ? 'book' : 'books'} available</p></div>
      <div className="book-grid">
        {books.map((book) => <article className={`book-card ${book.status !== 'available' ? 'unavailable' : ''}`} key={book.id}>
          <div className={`book-cover ${book.tone} ${book.image_url ? 'has-cover-image' : ''}`} style={book.image_url ? {backgroundImage:`url("${book.image_url.replaceAll('"','%22')}")`} : undefined}><span className="cover-kicker">Pre-loved edition</span><strong>{book.title}</strong><small>{book.author}</small>{book.status !== 'available' && <span className="status-stamp">{book.status}</span>}</div>
          <div className="book-meta"><div><h3>{book.title}</h3><p>{book.author} · {book.condition}</p></div><strong>{peso.format(book.price)}</strong></div>
          <p className="book-description">{book.description}</p>
          <button type="button" disabled={book.status !== 'available'} className={selected.includes(book.id) ? 'selected' : ''} onClick={() => toggle(book.id)}>{book.status === 'sold' ? 'Sold' : selected.includes(book.id) ? '✓ Added to claim' : 'Add to claim'}</button>
        </article>)}
      </div>
    </section>

    <section className="how" id="how"><p className="eyebrow">Know your place in line</p><h2>Claim in three easy steps.</h2><div className="steps"><div><span>01</span><h3>Pick your reads</h3><p>Add every book you want to one claim list.</p></div><div><span>02</span><h3>Join the miner list</h3><p>Submit your details to receive a position for each book.</p></div><div><span>03</span><h3>Wait for the seller</h3><p>Save your claim code. The seller will contact miners in queue order.</p></div></div></section>

      <footer><div className="brand"><BrandMark /><span>The Second Chapter</span></div><p>Every book deserves another chapter.</p></footer>

    {selected.length > 0 && <button className="mobile-claim" onClick={openClaimPanel}>Review {selected.length} {selected.length === 1 ? 'book' : 'books'} · {peso.format(total)}</button>}

    {open && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeClaimPanel()}>
      <section className="claim-panel" role="dialog" aria-modal="true" aria-labelledby="claim-title">
        <button className="close-button" aria-label="Close claim list" onClick={closeClaimPanel}>×</button>
        {confirmation ? <div className="confirmation"><BrandMark /><p className="eyebrow">Claim received</p><h2 id="claim-title">You&apos;re on the miner list!</h2><p>Download your receipt and send it to The Second Chapter Facebook page. If no receipt is sent, your claim will automatically be given to the next miner.</p><div className="miner-positions">{confirmation.items.map((item) => <div key={item.book_id}><span>{item.title}</span><strong>{ordinal(item.position)} miner</strong></div>)}</div><strong>{confirmation.code}</strong><div className="confirmation-total"><span>Book subtotal · {peso.format(confirmation.total)}</span><small>Shipping fee not included</small></div><div className="shipping-rates"><span>Shipping rates</span><div><small>1 book</small><strong>₱84</strong></div><div><small>2–3 books</small><strong>₱134</strong></div><div><small>4–6 books</small><strong>₱164</strong></div></div>{receiptError && <p className="receipt-error" role="alert">{receiptError}</p>}<div className="confirmation-actions"><button type="button" className="receipt-button" disabled={downloadingReceipt} onClick={downloadReceipt}>{downloadingReceipt ? 'Preparing receipt…' : '↓ Download receipt'}</button><button type="button" className="continue-button" onClick={closeClaimPanel}>Continue browsing</button></div></div> : <>
          <p className="eyebrow">Your claim list</p><h2 id="claim-title">Almost yours.</h2>
          {chosen.length ? <><div className="claim-items">{chosen.map((book) => <div key={book.id}><span><b>{book.title}</b><small>{book.author}</small></span><strong>{peso.format(book.price)}</strong><button aria-label={`Remove ${book.title}`} onClick={() => toggle(book.id)}>×</button></div>)}</div><div className="claim-total"><span>Book subtotal <small>Shipping fee not included</small></span><strong>{peso.format(total)}</strong></div><div className="shipping-rates"><span>Shipping rates</span><div><small>1 book</small><strong>₱84</strong></div><div><small>2–3 books</small><strong>₱134</strong></div><div><small>4–6 books</small><strong>₱164</strong></div></div>
          <form onSubmit={submit}><div className="form-grid"><label>Full name<input name="name" required maxLength={80} autoComplete="name" /></label><label>Mobile number<input name="phone" required maxLength={30} inputMode="tel" autoComplete="tel" /></label></div><label>Facebook profile or Messenger name<input name="facebook" required maxLength={200} placeholder="Link or exact profile name" /></label><label>Delivery method<select name="delivery" required><option value="">Choose one</option><option>Pickup</option><option>Maxim / Angkas</option><option>J&amp;T</option></select></label><label>Delivery address <small>(if applicable)</small><textarea name="address" rows={2} maxLength={300} /></label><label>Notes <small>(optional)</small><textarea name="notes" rows={2} maxLength={300} placeholder="Preferred pickup point, rider details, etc." /></label><label className="claim-disclaimer"><input name="termsAccepted" type="checkbox" required /><span>I understand that claims cannot be cancelled, I accept each book&apos;s stated condition, and no refunds or returns are allowed once an order has shipped.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="submit-claim" disabled={sending}>{sending ? 'Joining the miner list…' : `Submit claim · ${peso.format(total)}`}</button><p className="fine-print">Book subtotal excludes shipping. Submitting adds you to each book&apos;s miner queue; claims stay open until the seller marks a book sold.</p></form></> : <div className="empty-claim"><p>Your claim list is empty.</p><button onClick={closeClaimPanel}>Browse books</button></div>}
        </>}
      </section>
    </div>}
  </main>;
}
