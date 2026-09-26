'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import type { SellerUpdate } from '../../../lib/types';

const allowedImageTypes=['image/jpeg','image/png','image/webp'];
const maxImageSize=5*1024*1024;
const updateDate=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});

type StagedImage={file:File;previewUrl:string};
type UploadTicket={path:string;token:string};

export default function UpdatesDashboard({initialUpdates}:{initialUpdates:SellerUpdate[]}) {
  const [updates,setUpdates]=useState(initialUpdates);
  const [image,setImage]=useState<StagedImage|null>(null);
  const [posting,setPosting]=useState(false);
  const [deletingId,setDeletingId]=useState<number|null>(null);
  const [error,setError]=useState('');

  function chooseImage(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    if(!allowedImageTypes.includes(file.type)){setError('Please choose a JPG, PNG, or WebP image.');return;}
    if(file.size>maxImageSize){setError('The update photo must be 5 MB or smaller.');return;}
    if(image)URL.revokeObjectURL(image.previewUrl);
    setImage({file,previewUrl:URL.createObjectURL(file)});
    setError('');
  }

  function removeImage() {
    if(image)URL.revokeObjectURL(image.previewUrl);
    setImage(null);
  }

  async function cleanupUpload(path:string) {
    await fetch('/api/admin/update-image-upload',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({path})}).catch(()=>undefined);
  }

  async function uploadImage(file:File):Promise<string> {
    const ticketResponse=await fetch('/api/admin/update-image-upload',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:file.type,size:file.size})});
    const ticket=await ticketResponse.json() as Partial<UploadTicket>&{error?:string};
    if(!ticketResponse.ok||!ticket.path||!ticket.token)throw new Error(ticket.error||'Could not prepare the update photo.');
    const {error:uploadError}=await createClient().storage.from('update-images').uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:file.type,cacheControl:'31536000'});
    if(uploadError){await cleanupUpload(ticket.path);throw uploadError;}
    return ticket.path;
  }

  async function postUpdate(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    setPosting(true);
    setError('');
    let imagePath='';
    try {
      if(image)imagePath=await uploadImage(image.file);
      const response=await fetch('/api/admin/updates',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:form.get('title'),body:form.get('body'),image_path:imagePath||undefined})});
      const data=await response.json() as SellerUpdate&{error?:string};
      if(!response.ok)throw new Error(data.error||'Could not post the update.');
      imagePath='';
      removeImage();
      formElement.reset();
      setUpdates((current)=>[data,...current]);
    } catch(reason) {
      if(imagePath)await cleanupUpload(imagePath);
      setError(reason instanceof Error?reason.message:'Could not post the update.');
    } finally {
      setPosting(false);
    }
  }

  async function deleteUpdate(update:SellerUpdate) {
    if(!window.confirm(`Delete “${update.title}”? This cannot be undone.`))return;
    setDeletingId(update.id);
    setError('');
    try {
      const response=await fetch('/api/admin/updates',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id:update.id})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error||'Could not delete the update.');
      setUpdates((current)=>current.filter((item)=>item.id!==update.id));
    } catch(reason) {
      setError(reason instanceof Error?reason.message:'Could not delete the update.');
    } finally {
      setDeletingId(null);
    }
  }

  return <>
    <section className="metrics"><div><span>Total updates</span><strong>{updates.length}</strong></div><div><span>With photos</span><strong>{updates.filter((update)=>update.image_url).length}</strong></div><div><span>Latest post</span><strong className="metric-date">{updates[0]?updateDate.format(new Date(updates[0].created_at)):'—'}</strong></div></section>
    <section className="admin-section"><div className="admin-heading"><div><p className="eyebrow">Buyer updates</p><h2>Post an update</h2></div></div>
      <form className="update-post-form" onSubmit={postUpdate}>
        <label>Title<input name="title" required maxLength={120} disabled={posting} placeholder="What’s new?"/></label>
        <label>Message<textarea name="body" required maxLength={2000} rows={6} disabled={posting} placeholder="Share an announcement, shipping note, or upcoming drop…"/></label>
        <label className="update-photo-input">Photo <small>(optional · JPG, PNG, or WebP · maximum 5 MB)</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={posting} onChange={chooseImage}/></label>
        {image&&<div className="update-photo-preview"><div role="img" aria-label="Selected update photo preview" style={{backgroundImage:`url("${image.previewUrl.replaceAll('"','%22')}")`}}/><button type="button" disabled={posting} onClick={removeImage}>Remove photo</button></div>}
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={posting}>{posting?'Posting…':'Post update'}</button>
      </form>
    </section>
    <section className="admin-section"><div className="admin-heading"><div><p className="eyebrow">Published</p><h2>Recent updates</h2></div><span>{updates.length}</span></div>
      {updates.length?<div className="owner-update-list">{updates.map((update)=><article className={update.image_url?'has-image':undefined} key={update.id}>{update.image_url&&<div className="owner-update-image" role="img" aria-label={`Photo for ${update.title}`} style={{backgroundImage:`url("${update.image_url.replaceAll('"','%22')}")`}}/>}<div><time dateTime={update.created_at}>{updateDate.format(new Date(update.created_at))}</time><h3>{update.title}</h3><p>{update.body}</p><button type="button" disabled={deletingId!==null} onClick={()=>deleteUpdate(update)}>{deletingId===update.id?'Deleting…':'Delete update'}</button></div></article>)}</div>:<div className="empty-state">Your published updates will appear here.</div>}
    </section>
  </>;
}
