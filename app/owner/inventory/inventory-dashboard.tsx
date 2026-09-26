'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import type { Book } from '../../../lib/types';
import { createClient } from '../../../lib/supabase/client';

const peso = new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP', maximumFractionDigits:0 });
const allowedImageTypes = ['image/jpeg','image/png','image/webp'];
const maxImages = 8;
const maxImageSize = 5 * 1024 * 1024;

type StagedCover = {
  id: string;
  file?: File;
  existingUrl?: string;
  previewUrl: string;
  name: string;
};

type UploadTicket = { path:string; token:string };

export default function InventoryDashboard({ initialBooks }:{ initialBooks:Book[] }) {
  const [books,setBooks] = useState(initialBooks);
  const [adding,setAdding] = useState(false);
  const [error,setError] = useState('');
  const [selectedCovers,setSelectedCovers] = useState<StagedCover[]>([]);
  const [editingBook,setEditingBook] = useState<Book|null>(null);
  const [editCovers,setEditCovers] = useState<StagedCover[]>([]);
  const [editSaving,setEditSaving] = useState(false);
  const [editError,setEditError] = useState('');

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
    setAdding(true);
    setError('');
    const form = new FormData(event.currentTarget);
    let imagePaths:string[] = [];
    try {
      imagePaths = await uploadCovers(selectedCovers.flatMap(({file}) => file ? [file] : []));
      const payload = {...Object.fromEntries(form.entries()),image_paths:imagePaths};
      const response = await fetch('/api/admin/books',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const data = await response.json() as {error?:string};
      if (!response.ok) throw new Error(data.error || 'Could not add book');
      location.reload();
    } catch (reason) {
      await cleanupUploads(imagePaths);
      setError(reason instanceof Error ? reason.message : 'Could not add book');
      setAdding(false);
    }
  }

  function openEditor(book:Book) {
    const images = book.image_urls.length ? book.image_urls : book.image_url ? [book.image_url] : [];
    setEditingBook(book);
    setEditCovers(images.map((url,index) => ({id:`existing-${index}-${url}`,existingUrl:url,previewUrl:url,name:`Saved photo ${index+1}`})));
    setEditError('');
  }

  function closeEditor() {
    if (editSaving) return;
    editCovers.forEach((cover) => { if (cover.file) URL.revokeObjectURL(cover.previewUrl); });
    setEditingBook(null);
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

  async function bookStatus(id:number,status:Book['status']) {
    const previous = books;
    setBooks(books.map((book) => book.id === id ? {...book,status} : book));
    const response = await fetch('/api/admin/books',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status})});
    if (!response.ok) setBooks(previous);
  }

  return <>
    <section className="metrics"><div><span>Total books</span><strong>{books.length}</strong></div><div><span>Open for miners</span><strong>{books.filter((book) => book.status === 'available').length}</strong></div><div><span>Sold books</span><strong>{books.filter((book) => book.status === 'sold').length}</strong></div></section>
    <section className="admin-section" id="inventory">
      <div className="admin-heading"><div><p className="eyebrow">Inventory</p><h2>Add a new arrival</h2></div></div>
      <form className="add-book-form" onSubmit={add}>
        <label>Title<input name="title" required maxLength={120}/></label>
        <label>Author<input name="author" required maxLength={100}/></label>
        <label>Price (PHP)<input name="price" type="number" min="0" required/></label>
        <label>Condition<select name="condition"><option>Brand new</option><option>Like new</option><option>Very good</option><option>Good</option><option>Well loved</option></select></label>
        <label>Cover color<select name="tone"><option value="coral">Coral</option><option value="blue">Blue</option><option value="ochre">Ochre</option><option value="mint">Mint</option></select></label>
        <label className="wide cover-upload">Book photos <small>(optional · select up to 8 · JPG, PNG, or WebP · maximum 5 MB each)</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={adding} onChange={(event) => stageCovers(event,selectedCovers,setSelectedCovers,setError)}/></label>
        {selectedCovers.length > 0 && <CoverPreviews covers={selectedCovers} disabled={adding} onRemove={(id) => removeCover(id,selectedCovers,setSelectedCovers)}/>}
        <label className="wide">Condition notes<textarea name="description" rows={2} maxLength={400}/></label>
        {error && <p className="form-error wide">{error}</p>}
        <button disabled={adding}>{adding ? 'Uploading & adding…' : '+ Add to drop'}</button>
      </form>
      <div className="inventory-list">{books.map((book) => {const cover=book.image_urls[0]??book.image_url;return <div key={book.id}><span className={`mini-cover ${book.tone} ${cover?'has-image':''}`} style={cover?{backgroundImage:`url("${cover.replaceAll('"','%22')}")`}:undefined}>{book.title.slice(0,1)}</span><span><strong>{book.title}</strong><small>{book.author} · {peso.format(book.price)}{book.image_urls.length>1?` · ${book.image_urls.length} photos`:''}</small></span><div className="inventory-actions"><button type="button" onClick={() => openEditor(book)}>Edit</button><select value={book.status} onChange={(event) => bookStatus(book.id,event.target.value as Book['status'])} aria-label={`Status for ${book.title}`}><option value="available">Open for miners</option><option value="sold">Sold — close claims</option></select></div></div>})}</div>
    </section>

    {editingBook && <div className="edit-book-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}><section className="edit-book-modal" role="dialog" aria-modal="true" aria-labelledby="edit-book-title"><button type="button" className="edit-book-close" aria-label="Close editor" disabled={editSaving} onClick={closeEditor}>×</button><p className="eyebrow">Edit book drop</p><h2 id="edit-book-title">{editingBook.title}</h2><form className="edit-book-form" onSubmit={saveEdit}><label>Title<input name="title" required maxLength={120} defaultValue={editingBook.title}/></label><label>Author<input name="author" required maxLength={100} defaultValue={editingBook.author}/></label><label>Price (PHP)<input name="price" type="number" min="0" required defaultValue={editingBook.price}/></label><label>Condition<select name="condition" defaultValue={editingBook.condition}><option>Brand new</option><option>Like new</option><option>Very good</option><option>Good</option><option>Well loved</option></select></label><label>Cover color<select name="tone" defaultValue={editingBook.tone}><option value="coral">Coral</option><option value="blue">Blue</option><option value="ochre">Ochre</option><option value="mint">Mint</option></select></label><label className="wide cover-upload">Add photos <small>({editCovers.length}/{maxImages} selected)</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={editSaving||editCovers.length>=maxImages} onChange={(event) => stageCovers(event,editCovers,setEditCovers,setEditError)}/></label>{editCovers.length > 0 && <CoverPreviews covers={editCovers} disabled={editSaving} onRemove={(id) => removeCover(id,editCovers,setEditCovers)}/>}<label className="wide">Description &amp; condition notes<textarea name="description" rows={4} maxLength={400} defaultValue={editingBook.description}/></label>{editError&&<p className="form-error wide">{editError}</p>}<div className="edit-book-actions"><button type="button" disabled={editSaving} onClick={closeEditor}>Cancel</button><button type="submit" disabled={editSaving}>{editSaving?'Saving changes…':'Save changes'}</button></div></form></section></div>}
  </>;
}

function CoverPreviews({covers,disabled,onRemove}:{covers:StagedCover[];disabled:boolean;onRemove:(id:string)=>void}) {
  return <div className="cover-previews" aria-label={`${covers.length} selected book photos`}>{covers.map((cover,index) => <figure key={cover.id}><div className="cover-preview-image" role="img" aria-label={`Preview of ${cover.name}`} style={{backgroundImage:`url("${cover.previewUrl.replaceAll('"','%22')}")`}}/><button type="button" aria-label={`Remove ${cover.name}`} title="Remove photo" disabled={disabled} onClick={() => onRemove(cover.id)}>×</button><figcaption><strong>{index === 0 ? 'Primary' : `Photo ${index+1}`}</strong><span title={cover.name}>{cover.name}</span></figcaption></figure>)}</div>;
}
