'use client';

import { useMemo, useState } from 'react';
import type { Order } from '../../../lib/types';

const peso=new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0});
const ordinal=(position:number)=>{const mod100=position%100;if(mod100>=11&&mod100<=13)return `${position}th`;return `${position}${position%10===1?'st':position%10===2?'nd':position%10===3?'rd':'th'}`};

export default function ClaimsDashboard({initialOrders}:{initialOrders:Order[]}) {
  const [orders,setOrders]=useState(initialOrders);
  const [bookFilter,setBookFilter]=useState('all');
  const [queueOrder,setQueueOrder]=useState<'newest'|'oldest'>('newest');
  const [trackingDrafts,setTrackingDrafts]=useState<Record<string,string>>(()=>Object.fromEntries(initialOrders.map((order)=>[order.id,order.tracking_number??''])));
  const [savingId,setSavingId]=useState<string|null>(null);
  const [actionError,setActionError]=useState('');
  const bookTitles=useMemo(()=>Array.from(new Set(orders.flatMap(order=>order.items.map(item=>item.title)))).sort((a,b)=>a.localeCompare(b)),[orders]);
  const filteredOrders=useMemo(()=>orders.filter(order=>bookFilter==='all'||order.items.some(item=>item.title===bookFilter)).toSorted((a,b)=>{const difference=new Date(a.created_at).getTime()-new Date(b.created_at).getTime();return queueOrder==='oldest'?difference:-difference}),[orders,bookFilter,queueOrder]);
  const revenue=orders.filter(order=>['paid','shipped','completed'].includes(order.status)).reduce((sum,order)=>sum+order.total,0);

  async function saveOrder(id:string,status:string) {
    const trackingNumber=(trackingDrafts[id]??'').trim();
    if(status==='shipped'&&!trackingNumber) {
      setActionError('Enter a tracking number before marking an order shipped.');
      return;
    }
    const previous=orders;
    const statusUpdatedAt=new Date().toISOString();
    setSavingId(id);
    setActionError('');
    setOrders((current)=>current.map((order)=>order.id===id?{...order,status,tracking_number:trackingNumber||order.tracking_number,status_updated_at:statusUpdatedAt}:order));
    try {
      const response=await fetch('/api/admin/orders',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status,tracking_number:trackingNumber||undefined})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error||'Could not update the order.');
    } catch(reason) {
      setOrders(previous);
      setActionError(reason instanceof Error?reason.message:'Could not update the order.');
    } finally {
      setSavingId(null);
    }
  }

  return <>
    <section className="metrics"><div><span>Total claims</span><strong>{orders.length}</strong></div><div><span>Open claims</span><strong>{orders.filter(order=>order.status==='pending_payment').length}</strong></div><div><span>Confirmed sales</span><strong>{peso.format(revenue)}</strong></div></section>
    <section className="admin-section" id="orders">
      <div className="admin-heading"><div><p className="eyebrow">Buyer claims</p><h2>Miner queue</h2></div><span>{filteredOrders.length} of {orders.length}</span></div>
      <div className="queue-filters"><label>Book title<select value={bookFilter} onChange={event=>setBookFilter(event.target.value)}><option value="all">All book titles</option>{bookTitles.map(title=><option value={title} key={title}>{title}</option>)}</select></label><label>Queue order<select value={queueOrder} onChange={event=>setQueueOrder(event.target.value as 'newest'|'oldest')}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div>
      {actionError&&<p className="form-error order-action-error" role="alert">{actionError}</p>}
      {orders.length?(filteredOrders.length?<div className="order-list">{filteredOrders.map(order=><article key={order.id}>
        <div className="order-top"><div><strong>{order.code}</strong><span>{new Date(order.created_at).toLocaleDateString()}</span></div><select value={order.status} disabled={savingId!==null} onChange={event=>saveOrder(order.id,event.target.value)} aria-label={`Status for ${order.code}`}><option value="pending_payment">Pending payment</option><option value="paid">Paid</option><option value="shipped">Shipped</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
        <h3>{order.customer_name}</h3>
        <div className="order-books">{order.items.map((item,index)=><div key={`${item.book_id??'deleted'}-${index}`}><span>{item.title}</span><strong>{ordinal(item.miner_position)} miner</strong></div>)}</div>
        <div className="order-contact"><span>{order.facebook_profile}</span><span>{order.phone}</span><span>{order.delivery_method}</span></div>
        <div className="order-tracking"><label>Tracking number <small>Required before marking as shipped</small><input value={trackingDrafts[order.id]??''} maxLength={100} disabled={savingId!==null} placeholder="Courier tracking number" onChange={(event)=>setTrackingDrafts((current)=>({...current,[order.id]:event.target.value}))}/></label>{order.status==='shipped'&&<button type="button" disabled={savingId!==null||!(trackingDrafts[order.id]??'').trim()} onClick={()=>saveOrder(order.id,'shipped')}>{savingId===order.id?'Saving…':'Save tracking'}</button>}</div>
        <strong className="order-total">{peso.format(order.total)}</strong>
      </article>)}</div>:<div className="empty-state">No miner claims match these filters.</div>):<div className="empty-state">New buyer claims will appear here.</div>}
    </section>
  </>;
}
