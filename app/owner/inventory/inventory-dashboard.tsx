'use client';

import { FormEvent, useState } from 'react';
import type { Book } from '../../../lib/types';

const peso=new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0});

export default function InventoryDashboard({initialBooks}:{initialBooks:Book[]}) {
  const [books,setBooks]=useState(initialBooks);
  const [adding,setAdding]=useState(false);
  const [error,setError]=useState('');

  async function add(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setAdding(true);setError('');
    const form=new FormData(event.currentTarget);
    const payload=Object.fromEntries(form.entries());
    const response=await fetch('/api/admin/books',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json() as {error?:string};
    if(response.ok)location.reload();else{setError(data.error||'Could not add book');setAdding(false)}
  }

  async function bookStatus(id:number,status:Book['status']) {
    const previous=books;
    setBooks(books.map(book=>book.id===id?{...book,status}:book));
    const response=await fetch('/api/admin/books',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status})});
    if(!response.ok)setBooks(previous);
  }

  return <>
    <section className="metrics"><div><span>Total books</span><strong>{books.length}</strong></div><div><span>Open for miners</span><strong>{books.filter(book=>book.status==='available').length}</strong></div><div><span>Sold books</span><strong>{books.filter(book=>book.status==='sold').length}</strong></div></section>
    <section className="admin-section" id="inventory"><div className="admin-heading"><div><p className="eyebrow">Inventory</p><h2>Add a new arrival</h2></div></div><form className="add-book-form" onSubmit={add}><label>Title<input name="title" required maxLength={120}/></label><label>Author<input name="author" required maxLength={100}/></label><label>Price (PHP)<input name="price" type="number" min="0" required/></label><label>Condition<select name="condition"><option>Brand new</option><option>Like new</option><option>Very good</option><option>Good</option><option>Well loved</option></select></label><label>Cover color<select name="tone"><option value="coral">Coral</option><option value="blue">Blue</option><option value="ochre">Ochre</option><option value="mint">Mint</option></select></label><label className="wide">Cover image URL <small>(optional)</small><input name="image_url" type="url" maxLength={500} placeholder="https://…" /></label><label className="wide">Condition notes<textarea name="description" rows={2} maxLength={400}/></label>{error&&<p className="form-error wide">{error}</p>}<button disabled={adding}>{adding?'Adding…':'+ Add to drop'}</button></form><div className="inventory-list">{books.map(book=><div key={book.id}><span className={`mini-cover ${book.tone}`}>{book.title.slice(0,1)}</span><span><strong>{book.title}</strong><small>{book.author} · {peso.format(book.price)}</small></span><select value={book.status} onChange={event=>bookStatus(book.id,event.target.value as Book['status'])} aria-label={`Status for ${book.title}`}><option value="available">Open for miners</option><option value="sold">Sold — close claims</option></select></div>)}</div></section>
  </>;
}
