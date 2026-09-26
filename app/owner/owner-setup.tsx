'use client';
import { FormEvent, useState } from 'react';

export default function OwnerSetup({email,configured}:{email:string;configured:boolean}) {
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(''); const code=new FormData(event.currentTarget).get('code'); const response=await fetch('/api/admin/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})}); const data=await response.json() as {error?:string}; if(response.ok) location.reload(); else setError(data.error||'Setup failed.'); setBusy(false); }
  return <main className="owner-shell"><section className="setup-card"><a href="/" className="brand"><span className="brand-mark">D</span><span>Dog-Eared Books</span></a>{configured ? <><p className="eyebrow">Seller dashboard</p><h1>This shop already has an owner.</h1><p>You’re signed in as {email}, but this account does not own the shop.</p><a className="primary-button" href="/">Return to storefront</a></> : <><p className="eyebrow">One-time seller setup</p><h1>Make this shop yours.</h1><p>You’re signed in as <strong>{email}</strong>. Enter the private setup code supplied with your site.</p><form onSubmit={submit}><label>Setup code<input name="code" type="password" required autoFocus /></label>{error&&<p className="form-error">{error}</p>}<button className="submit-claim" disabled={busy}>{busy?'Checking…':'Unlock seller dashboard'}</button></form></>}</section></main>;
}
