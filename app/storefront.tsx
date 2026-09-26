'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { Book } from '../lib/types';

const peso = new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP', maximumFractionDigits:0 });

export default function Storefront({ initialBooks }: { initialBooks: Book[] }) {
  const [books, setBooks] = useState(initialBooks);
  const [selected, setSelected] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<{code:string;total:number}|null>(null);
  const chosen = useMemo(() => books.filter((book) => selected.includes(book.id)), [books, selected]);
  const total = chosen.reduce((sum, book) => sum + book.price, 0);
  const available = books.filter((book) => book.status === 'available').length;

  function toggle(id:number) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current,id]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch('/api/claim', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({...payload,bookIds:selected}) });
      const data = await response.json() as {error?:string;code?:string;total?:number};
      if (!response.ok) throw new Error(data.error || 'Could not submit your claim.');
      setConfirmation({code:data.code!,total:data.total!});
      setBooks((current) => current.map((book) => selected.includes(book.id) ? {...book,status:'reserved'} : book));
      setSelected([]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Something went wrong.'); }
    finally { setSending(false); }
  }

  return <main>
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Dog-Eared Books home"><span className="brand-mark">D</span><span>Dog-Eared Books</span></a>
      <nav><a href="#how">How it works</a><a href="/owner">Seller</a></nav>
      <button className="bag-button" onClick={() => setOpen(true)}>Claim list <span>{selected.length}</span></button>
    </header>

    <section className="hero" id="top">
      <p className="eyebrow">Fresh off the shelf · New drop</p>
      <h1>Good stories deserve<br /><em>another reader.</em></h1>
      <p className="hero-copy">Pre-loved books, carefully checked and ready for their next chapter. Claim yours before someone else does.</p>
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
          <button type="button" disabled={book.status !== 'available'} className={selected.includes(book.id) ? 'selected' : ''} onClick={() => toggle(book.id)}>{book.status !== 'available' ? 'Already claimed' : selected.includes(book.id) ? '✓ Added to claim' : 'Add to claim'}</button>
        </article>)}
      </div>
    </section>

    <section className="how" id="how"><p className="eyebrow">No more “is this available?”</p><h2>Claim in three easy steps.</h2><div className="steps"><div><span>01</span><h3>Pick your reads</h3><p>Add every book you want to one claim list.</p></div><div><span>02</span><h3>Leave your details</h3><p>Tell us how to reach you and how you want your books delivered.</p></div><div><span>03</span><h3>Get your claim code</h3><p>Save your code and wait for payment confirmation from the seller.</p></div></div></section>

    <footer><div className="brand"><span className="brand-mark">D</span><span>Dog-Eared Books</span></div><p>Every book deserves another chapter.</p></footer>

    {selected.length > 0 && <button className="mobile-claim" onClick={() => setOpen(true)}>Review {selected.length} {selected.length === 1 ? 'book' : 'books'} · {peso.format(total)}</button>}

    {open && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="claim-panel" role="dialog" aria-modal="true" aria-labelledby="claim-title">
        <button className="close-button" aria-label="Close claim list" onClick={() => setOpen(false)}>×</button>
        {confirmation ? <div className="confirmation"><span className="confirmation-mark">✓</span><p className="eyebrow">Claim received</p><h2 id="claim-title">Your books are reserved!</h2><p>Save this claim code. The seller will contact you through Facebook to confirm payment and delivery.</p><strong>{confirmation.code}</strong><div className="confirmation-total">Total · {peso.format(confirmation.total)}</div><button onClick={() => {setConfirmation(null);setOpen(false)}}>Continue browsing</button></div> : <>
          <p className="eyebrow">Your claim list</p><h2 id="claim-title">Almost yours.</h2>
          {chosen.length ? <><div className="claim-items">{chosen.map((book) => <div key={book.id}><span><b>{book.title}</b><small>{book.author}</small></span><strong>{peso.format(book.price)}</strong><button aria-label={`Remove ${book.title}`} onClick={() => toggle(book.id)}>×</button></div>)}</div><div className="claim-total"><span>Total</span><strong>{peso.format(total)}</strong></div>
          <form onSubmit={submit}><div className="form-grid"><label>Full name<input name="name" required maxLength={80} autoComplete="name" /></label><label>Mobile number<input name="phone" required maxLength={30} inputMode="tel" autoComplete="tel" /></label></div><label>Facebook profile or Messenger name<input name="facebook" required maxLength={200} placeholder="Link or exact profile name" /></label><label>Delivery method<select name="delivery" required><option value="">Choose one</option><option>Meetup / pickup</option><option>Courier delivery</option><option>Shipping</option></select></label><label>Delivery address <small>(if applicable)</small><textarea name="address" rows={2} maxLength={300} /></label><label>Notes <small>(optional)</small><textarea name="notes" rows={2} maxLength={300} placeholder="Preferred meetup point, courier, etc." /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="submit-claim" disabled={sending}>{sending ? 'Reserving your books…' : `Submit claim · ${peso.format(total)}`}</button><p className="fine-print">Your books will be marked reserved as soon as you submit.</p></form></> : <div className="empty-claim"><p>Your claim list is empty.</p><button onClick={() => setOpen(false)}>Browse books</button></div>}
        </>}
      </section>
    </div>}
  </main>;
}
