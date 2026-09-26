'use client';

import { FormEvent, useState } from 'react';
import type { PublicOrderStatus } from '../../lib/types';

const stages=[
  {key:'pending_payment',label:'Pending payment'},
  {key:'paid',label:'Paid'},
  {key:'shipped',label:'Shipped'},
  {key:'completed',label:'Completed'},
];
const statusDate=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});

export default function OrderTracker() {
  const [code,setCode]=useState('');
  const [result,setResult]=useState<PublicOrderStatus|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  async function track(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response=await fetch('/api/order-status',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});
      const data=await response.json() as PublicOrderStatus&{error?:string};
      if(!response.ok)throw new Error(data.error||'Could not check this claim.');
      setResult(data);
    } catch(reason) {
      setError(reason instanceof Error?reason.message:'Could not check this claim.');
    } finally {
      setLoading(false);
    }
  }

  const activeStage=result?stages.findIndex((stage)=>stage.key===result.status):-1;

  return <section className="order-tracker" id="track-order">
    <div className="order-tracker-intro"><p className="eyebrow">Claim tracker</p><h2>Track your order.</h2><p>Enter the claim code from your receipt to see its latest status and shipping details.</p></div>
    <div className="order-tracker-panel">
      <form onSubmit={track}><label htmlFor="claim-code">Claim code</label><div><input id="claim-code" value={code} required maxLength={12} autoComplete="off" spellCheck={false} placeholder="READ-XXXXXXX" onChange={(event)=>setCode(event.target.value.toUpperCase())}/><button disabled={loading}>{loading?'Checking…':'Track claim'}</button></div></form>
      {error&&<p className="tracker-error" role="alert">{error}</p>}
      {result&&<div className="tracking-result">
        <div className="tracking-result-heading"><div><span>Claim code</span><strong>{result.code}</strong></div><time dateTime={result.status_updated_at}>Updated {statusDate.format(new Date(result.status_updated_at))}</time></div>
        {result.status==='cancelled'?<div className="cancelled-status">This claim was cancelled.</div>:<ol className="status-steps">{stages.map((stage,index)=><li className={index<=activeStage?'active':undefined} key={stage.key}><span>{index<activeStage?'✓':index+1}</span><strong>{stage.label}</strong></li>)}</ol>}
        <div className="tracked-books"><span>Books in this claim</span>{result.items.map((title,index)=><strong key={`${title}-${index}`}>{title}</strong>)}</div>
        {result.tracking_number&&<div className="tracking-number"><span>Courier tracking number</span><strong>{result.tracking_number}</strong><small>Use this number on your courier’s tracking website.</small></div>}
        {result.status==='shipped'&&!result.tracking_number&&<p className="tracking-pending">The seller is preparing the tracking details. Please check again shortly.</p>}
      </div>}
    </div>
  </section>;
}
