'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import type { Book } from '../../../lib/types';
import { createClient } from '../../../lib/supabase/client';

const peso = new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP', maximumFractionDigits:0 });
const allowedImageTypes = ['image/jpeg','image/png','image/webp'];
const maxImages = 8;
const maxImageSize = 5 * 1024 * 1024;
const booksPerPage = 20;
const postingDateTime = new Intl.DateTimeFormat('en-PH', { timeZone:'Asia/Manila', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });
const postingInputDateTime = new Intl.DateTimeFormat('en-US', { timeZone:'Asia/Manila', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });

function toPostingInputValue(value:Date) {
  const parts=Object.fromEntries(postingInputDateTime.formatToParts(value).map((part) => [part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function toPostingIso(value:FormDataEntryValue|null) {
  const date = new Date(`${String(value ?? '')}:00+08:00`);
  if (Number.isNaN(date.getTime())) throw new Error('Choose a valid posting date and time.');
  return date.toISOString();
}

type StagedCover = {
  id: string;
  file?: File;
  existingUrl?: string;
  previewUrl: string;
  name: string;
};

type UploadTicket = { path:string; token:string };
type InventoryAction = 'status'|'delete'|null;

export default function InventoryDashboard({ initialBooks,currentTime }:{ initialBooks:Book[];currentTime:string }) {
  const [books,setBooks] = useState(initialBooks);
  const [adding,setAdding] = useState(false);
  const [error,setError] = useState('');
  const [publishAt,setPublishAt] = useState(() => toPostingInputValue(new Date(currentTime)));
  const [newOnSale,setNewOnSale] = useState(false);
  const [selectedCovers,setSelectedCovers] = useState<StagedCover[]>([]);
  const [editingBook,setEditingBook] = useState<Book|null>(null);
  const [editPublishAt,setEditPublishAt] = useState('');
  const [editOnSale,setEditOnSale] = useState(false);
  const [editCovers,setEditCovers] = useState<StagedCover[]>([]);
  const [editSaving,setEditSaving] = useState(false);
  const [editError,setEditError] = useState('');
  const [page,setPage] = useState(1);
  const [selectedIds,setSelectedIds] = useState<Set<number>>(() => new Set());
  const [inventoryAction,setInventoryAction] = useState<InventoryAction>(null);
  const [inventoryError,setInventoryError] = useState('');
  const [inventorySearch,setInventorySearch] = useState('');

  function stageCovers(event:ChangeEvent<HTMLInputElement>, current:StagedCover[], update:(covers:StagedCover[])=>void, showError:(message:string)=>void) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    if (current.length + files.length > maxImages) { showError(`You can select up to ${maxImages} photos for one book.`); return; }
    if (files.some((file) => !allowedImageTypes.includes(file.type))) { showError('Please choose only JPG, PNG, or WebP images.'); return; }
    if (files.some((file) => file.size > maxImageSize)) { showError('Each cover photo must be 5 MB or smaller.'); return; }
    const known = new Set(current.filter(({file}) => file).map(({file}) => `${file!.name}:${file!.size}:${file!.lastModified}`));
    const additions = files
      .filter((file) => !known.has(`${file.name}:${file.size}:${file.lastModified}`))
      .map((file,index) => ({
        id:`${file.name}-${file.lastModified}-${index}-${crypto.randomUUID()}`,
        file,
        previewUrl:URL.createObjectURL(file),
        name:file.name,
      }));
    update([...current,...additions]);
    showError('');
  }

  function removeCover(id:string, current:StagedCover[], update:(covers:StagedCover[])=>void) {
    const removed = current.find((cover) => cover.id === id);
    if (removed?.file) URL.revokeObjectURL(removed.previewUrl);
    update(current.filter((cover) => cover.id !== id));
  }

  async function cleanupUploads(paths:string[]) {
    if (!paths.length) return;
    await fetch('/api/admin/book-cover-upload', {
      method:'DELETE',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({paths}),
    }).catch(() => undefined);
  }

  async function uploadCovers(files:File[]) {
    if (!files.length) return [];
    const ticketResponse = await fetch('/api/admin/book-cover-upload', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({files:files.map((file) => ({type:file.type,size:file.size}))}),
    });
    const ticket = await ticketResponse.json() as {uploads?:UploadTicket[];error?:string};
    if (!ticketResponse.ok || ticket.uploads?.length !== files.length) throw new Error(ticket.error || 'Could not prepare the photo uploads.');
    const uploads = ticket.uploads;
    try {
      const supabase = createClient();
      await Promise.all(uploads.map(async (upload,index) => {
        const { error:uploadError } = await supabase.storage.from('book-covers').uploadToSignedUrl(upload.path,upload.token,files[index],{contentType:files[index].type,cacheControl:'31536000'});
        if (uploadError) throw uploadError;
      }));
      return uploads.map(({path}) => path);
    } catch (reason) {
      await cleanupUploads(uploads.map(({path}) => path));
      throw reason;
    }
  }

  async function add(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement=event.currentTarget;
    setAdding(true);
    setError('');
    const form = new FormData(event.currentTarget);
    let imagePaths:string[] = [];
    try {
      imagePaths = await uploadCovers(selectedCovers.flatMap(({file}) => file ? [file] : []));
      const payload = {...Object.fromEntries(form.entries()),publish_at:toPostingIso(form.get('publish_at')),is_on_sale:newOnSale,discount_amount:newOnSale?Number(form.get('discount_amount')):0,image_paths:imagePaths};
      const response = await fetch('/api/admin/books',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const data = await response.json() as {error?:string};
      if (!response.ok) throw new Error(data.error || 'Could not add book');
      imagePaths=[];
      selectedCovers.forEach((cover) => { if (cover.file) URL.revokeObjectURL(cover.previewUrl); });
      setSelectedCovers([]);
      setNewOnSale(false);
      formElement.reset();
      const refreshed=await fetch('/api/admin/books');
      if(!refreshed.ok)throw new Error('Book added, but the inventory could not be refreshed. Reload this page to see it.');
      setBooks(await refreshed.json() as Book[]);
      setSelectedIds(new Set());
      setInventorySearch('');
      setPage(1);
      setAdding(false);
    } catch (reason) {
      await cleanupUploads(imagePaths);
      setError(reason instanceof Error ? reason.message : 'Could not add book');
      setAdding(false);
    }
  }

  function openEditor(book:Book) {
    const images = book.image_urls.length ? book.image_urls : book.image_url ? [book.image_url] : [];
    setEditingBook(book);
    setEditPublishAt(toPostingInputValue(new Date(book.publish_at)));
    setEditOnSale(book.is_on_sale);
    setEditCovers(images.map((url,index) => ({id:`existing-${index}-${url}`,existingUrl:url,previewUrl:url,name:`Saved photo ${index+1}`})));
    setEditError('');
  }

  function closeEditor() {
    if (editSaving) return;
    editCovers.forEach((cover) => { if (cover.file) URL.revokeObjectURL(cover.previewUrl); });
    setEditingBook(null);
    setEditPublishAt('');
    setEditOnSale(false);
    setEditCovers([]);
    setEditError('');
  }

  async function saveEdit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingBook) return;
    setEditSaving(true);
    setEditError('');
    const form = new FormData(event.currentTarget);
    let imagePaths:string[] = [];
    try {
      imagePaths = await uploadCovers(editCovers.flatMap(({file}) => file ? [file] : []));
      const payload = {
        ...Object.fromEntries(form.entries()),
        publish_at:toPostingIso(form.get('publish_at')),
        is_on_sale:editOnSale,
        discount_amount:editOnSale?Number(form.get('discount_amount')):0,
        action:'edit',
        id:editingBook.id,
        existing_image_urls:editCovers.flatMap(({existingUrl}) => existingUrl ? [existingUrl] : []),
        image_paths:imagePaths,
      };
      const response = await fetch('/api/admin/books',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const data = await response.json() as {error?:string};
      if (!response.ok) throw new Error(data.error || 'Could not update book');
      location.reload();
    } catch (reason) {
      await cleanupUploads(imagePaths);
      setEditError(reason instanceof Error ? reason.message : 'Could not update book');
      setEditSaving(false);
    }
  }

  async function updateStatuses(ids:number[],status:Book['status']) {
    const previous=books;
    setInventoryAction('status');
    setInventoryError('');
    setBooks((current) => current.map((book) => ids.includes(book.id) ? {...book,status} : book));
    try {
      const response=await fetch('/api/admin/books',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:'bulk-status',ids,status})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error||'Could not update the selected books.');
      setSelectedIds((current) => {
        const next=new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch(reason) {
      setBooks(previous);
      setInventoryError(reason instanceof Error?reason.message:'Could not update the selected books.');
    } finally {
      setInventoryAction(null);
    }
  }

  async function deleteBooks(ids:number[]) {
    const selectedBooks=books.filter((book) => ids.includes(book.id));
    if(!selectedBooks.length)return;
    const prompt=selectedBooks.length===1
      ? `Delete “${selectedBooks[0].title}”? This cannot be undone.`
      : `Delete ${selectedBooks.length} selected arrivals? This cannot be undone.`;
    if(!window.confirm(prompt))return;
    setInventoryAction('delete');
    setInventoryError('');
    try {
      const response=await fetch('/api/admin/books',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({ids})});
      const data=await response.json() as {error?:string;deletedIds?:number[]};
      if(!response.ok)throw new Error(data.error||'Could not delete the selected books.');
      const deletedIds=new Set(data.deletedIds??ids);
      setBooks((current) => current.filter((book) => !deletedIds.has(book.id)));
      setSelectedIds((current) => {
        const next=new Set(current);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
    } catch(reason) {
      setInventoryError(reason instanceof Error?reason.message:'Could not delete the selected books.');
    } finally {
      setInventoryAction(null);
    }
  }

  function toggleBook(id:number) {
    setSelectedIds((current) => {
      const next=new Set(current);
      if(next.has(id))next.delete(id);else next.add(id);
      return next;
    });
  }

  function togglePage(ids:number[],select:boolean) {
    setSelectedIds((current) => {
      const next=new Set(current);
      ids.forEach((id) => select?next.add(id):next.delete(id));
      return next;
    });
  }

  const now=new Date(currentTime).getTime();
  const scheduled=books.filter((book) => new Date(book.publish_at).getTime() > now).length;
  const normalizedSearch=inventorySearch.trim().toLocaleLowerCase();
  const filteredBooks=normalizedSearch?books.filter((book) => `${book.title} ${book.author}`.toLocaleLowerCase().includes(normalizedSearch)):books;
  const pageCount=Math.max(1,Math.ceil(filteredBooks.length/booksPerPage));
  const currentPage=Math.min(page,pageCount);
  const pageStart=(currentPage-1)*booksPerPage;
  const visibleBooks=filteredBooks.slice(pageStart,pageStart+booksPerPage);
  const visibleIds=visibleBooks.map((book) => book.id);
  const pageIsSelected=visibleIds.length>0&&visibleIds.every((id) => selectedIds.has(id));
  const actionInProgress=inventoryAction!==null;

  return <>
    <section className="metrics"><div><span>Total books</span><strong>{books.length}</strong></div><div><span>Live now</span><strong>{books.filter((book) => book.status === 'available' && new Date(book.publish_at).getTime() <= now).length}</strong></div><div><span>Scheduled</span><strong>{scheduled}</strong></div></section>
    <section className="admin-section" id="inventory">
      <div className="admin-heading"><div><p className="eyebrow">Inventory</p><h2>Add a new arrival</h2></div></div>
      <form className="add-book-form" onSubmit={add}>
        <label>Title<input name="title" required maxLength={120}/></label>
        <label>Author<input name="author" required maxLength={100}/></label>
        <label>Price (PHP)<input name="price" type="number" min="0" required/></label>
        <label className="sale-toggle">Sale<span><input type="checkbox" checked={newOnSale} disabled={adding} onChange={(event) => setNewOnSale(event.target.checked)}/> Mark as on sale</span></label>
        <label>Discount (PHP)<small>Amount deducted from the regular price</small><input name="discount_amount" type="number" min="1" step="1" required={newOnSale} disabled={adding||!newOnSale}/></label>
        <label>Condition<select name="condition"><option>Brand new</option><option>Like new</option><option>Very good</option><option>Good</option><option>Well loved</option></select></label>
        <label>Cover color<select name="tone"><option value="coral">Coral</option><option value="blue">Blue</option><option value="ochre">Ochre</option><option value="mint">Mint</option></select></label>
        <label className="wide schedule-field">Posting date and time <small>This stays selected after adding so every book in this arrival can share the exact release time.</small><input name="publish_at" type="datetime-local" required value={publishAt} disabled={adding} onChange={(event) => setPublishAt(event.target.value)}/></label>
        <label className="wide cover-upload">Book photos <small>(optional · select up to 8 · JPG, PNG, or WebP · maximum 5 MB each)</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={adding} onChange={(event) => stageCovers(event,selectedCovers,setSelectedCovers,setError)}/></label>
        {selectedCovers.length > 0 && <CoverPreviews covers={selectedCovers} disabled={adding} onRemove={(id) => removeCover(id,selectedCovers,setSelectedCovers)}/>}
        <label className="wide">Condition notes<textarea name="description" rows={2} maxLength={400}/></label>
        {error && <p className="form-error wide">{error}</p>}
        <button disabled={adding}>{adding ? 'Uploading & adding…' : '+ Add to drop'}</button>
      </form>

      <div className="inventory-search"><span aria-hidden="true">⌕</span><input type="search" value={inventorySearch} onChange={(event) => {setInventorySearch(event.target.value);setPage(1);}} placeholder="Search by title or author" aria-label="Search seller inventory"/>{inventorySearch&&<button type="button" onClick={() => {setInventorySearch('');setPage(1);}}>Clear</button>}</div>
      <div className="inventory-toolbar">
        <input className="inventory-select-page" type="checkbox" aria-label="Select all arrivals on this page" checked={pageIsSelected} disabled={!visibleIds.length||actionInProgress} onChange={(event) => togglePage(visibleIds,event.target.checked)}/>
        <span>{selectedIds.size?`${selectedIds.size} selected`:normalizedSearch?`${filteredBooks.length} of ${books.length} arrivals`:`${books.length} ${books.length===1?'arrival':'arrivals'}`}</span>
        <div className="inventory-bulk-actions" aria-label="Actions for selected arrivals">
          <button type="button" disabled={!selectedIds.size||actionInProgress} onClick={() => updateStatuses([...selectedIds],'available')}>Mark open</button>
          <button type="button" disabled={!selectedIds.size||actionInProgress} onClick={() => updateStatuses([...selectedIds],'sold')}>Mark sold</button>
          <button type="button" className="danger" disabled={!selectedIds.size||actionInProgress} onClick={() => deleteBooks([...selectedIds])}>{inventoryAction==='delete'?'Deleting…':'Delete selected'}</button>
        </div>
      </div>
      {inventoryError&&<p className="form-error inventory-error" role="alert">{inventoryError}</p>}

      {visibleBooks.length?<div className="inventory-list">{visibleBooks.map((book) => {
        const cover=book.image_urls[0]??book.image_url;
        const isScheduled=new Date(book.publish_at).getTime()>now;
        return <div className={selectedIds.has(book.id)?'selected':''} key={book.id}>
          <input className="inventory-row-select" type="checkbox" aria-label={`Select inventory item ${book.title}`} checked={selectedIds.has(book.id)} disabled={actionInProgress} onChange={() => toggleBook(book.id)}/>
          <span className={`mini-cover ${book.tone} ${cover?'has-image':''}`} style={cover?{backgroundImage:`url("${cover.replaceAll('"','%22')}")`}:undefined}>{book.title.slice(0,1)}</span>
          <span className="inventory-book-summary"><strong>{book.title}</strong><small>{book.author} · {book.is_on_sale?<><s>{peso.format(book.price)}</s> <b className="sale-price">{peso.format(book.price-book.discount_amount)}</b> · {peso.format(book.discount_amount)} off</>:peso.format(book.price)}{book.image_urls.length>1?` · ${book.image_urls.length} photos`:''}</small><small className={isScheduled?'posting-status scheduled':'posting-status'}>{isScheduled?'Scheduled':'Posted'} · {postingDateTime.format(new Date(book.publish_at))}</small></span>
          <div className="inventory-actions"><button type="button" disabled={actionInProgress} onClick={() => openEditor(book)}>Edit</button><select value={book.status} disabled={actionInProgress} onChange={(event) => updateStatuses([book.id],event.target.value as Book['status'])} aria-label={`Status for ${book.title}`}><option value="available">Open for miners</option><option value="sold">Sold — close claims</option></select><button type="button" className="danger" disabled={actionInProgress} onClick={() => deleteBooks([book.id])}>Delete</button></div>
        </div>;
      })}</div>:<div className="empty-state inventory-empty">{books.length?`No inventory items match “${inventorySearch.trim()}”.`:'Add your first arrival using the form above.'}</div>}

      {filteredBooks.length>0&&<nav className="inventory-pagination" aria-label="Inventory pages"><span>Showing {pageStart+1}–{Math.min(pageStart+booksPerPage,filteredBooks.length)} of {filteredBooks.length}</span><div><button type="button" disabled={currentPage===1||actionInProgress} onClick={() => setPage(currentPage-1)}>Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" disabled={currentPage===pageCount||actionInProgress} onClick={() => setPage(currentPage+1)}>Next</button></div></nav>}
    </section>

    {editingBook && <div className="edit-book-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}><section className="edit-book-modal" role="dialog" aria-modal="true" aria-labelledby="edit-book-title"><button type="button" className="edit-book-close" aria-label="Close editor" disabled={editSaving} onClick={closeEditor}>×</button><p className="eyebrow">Edit book drop</p><h2 id="edit-book-title">{editingBook.title}</h2><form className="edit-book-form" onSubmit={saveEdit}><label>Title<input name="title" required maxLength={120} defaultValue={editingBook.title}/></label><label>Author<input name="author" required maxLength={100} defaultValue={editingBook.author}/></label><label>Price (PHP)<input name="price" type="number" min="0" required defaultValue={editingBook.price}/></label><label className="sale-toggle">Sale<span><input type="checkbox" checked={editOnSale} disabled={editSaving} onChange={(event) => setEditOnSale(event.target.checked)}/> Mark as on sale</span></label><label>Discount (PHP)<small>Amount deducted from the regular price</small><input name="discount_amount" type="number" min="1" step="1" required={editOnSale} disabled={editSaving||!editOnSale} defaultValue={editingBook.discount_amount||''}/></label><label>Condition<select name="condition" defaultValue={editingBook.condition}><option>Brand new</option><option>Like new</option><option>Very good</option><option>Good</option><option>Well loved</option></select></label><label>Cover color<select name="tone" defaultValue={editingBook.tone}><option value="coral">Coral</option><option value="blue">Blue</option><option value="ochre">Ochre</option><option value="mint">Mint</option></select></label><label>Posting date and time<input name="publish_at" type="datetime-local" required value={editPublishAt} disabled={editSaving} onChange={(event) => setEditPublishAt(event.target.value)}/></label><label className="wide cover-upload">Add photos <small>({editCovers.length}/{maxImages} selected)</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={editSaving||editCovers.length>=maxImages} onChange={(event) => stageCovers(event,editCovers,setEditCovers,setEditError)}/></label>{editCovers.length > 0 && <CoverPreviews covers={editCovers} disabled={editSaving} onRemove={(id) => removeCover(id,editCovers,setEditCovers)}/>}<label className="wide">Description &amp; condition notes<textarea name="description" rows={4} maxLength={400} defaultValue={editingBook.description}/></label>{editError&&<p className="form-error wide">{editError}</p>}<div className="edit-book-actions"><button type="button" disabled={editSaving} onClick={closeEditor}>Cancel</button><button type="submit" disabled={editSaving}>{editSaving?'Saving changes…':'Save changes'}</button></div></form></section></div>}
  </>;
}

function CoverPreviews({covers,disabled,onRemove}:{covers:StagedCover[];disabled:boolean;onRemove:(id:string)=>void}) {
  return <div className="cover-previews" aria-label={`${covers.length} selected book photos`}>{covers.map((cover,index) => <figure key={cover.id}><div className="cover-preview-image" role="img" aria-label={`Preview of ${cover.name}`} style={{backgroundImage:`url("${cover.previewUrl.replaceAll('"','%22')}")`}}/><button type="button" aria-label={`Remove ${cover.name}`} title="Remove photo" disabled={disabled} onClick={() => onRemove(cover.id)}>×</button><figcaption><strong>{index === 0 ? 'Primary' : `Photo ${index+1}`}</strong><span title={cover.name}>{cover.name}</span></figcaption></figure>)}</div>;
}
