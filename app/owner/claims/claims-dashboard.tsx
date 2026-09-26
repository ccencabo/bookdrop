'use client';

import { useMemo, useState } from 'react';
import type { Order } from '../../../lib/types';

const peso=new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0});
const ordinal=(position:number)=>{const mod100=position%100;if(mod100>=11&&mod100<=13)return `${position}th`;return `${position}${position%10===1?'st':position%10===2?'nd':position%10===3?'rd':'th'}`};

export default function ClaimsDashboard({initialOrders}:{initialOrders:Order[]}) {
  const [orders,setOrders]=useState(initialOrders);
  const [bookFilter,setBookFilter]=useState('all');
  const [queueOrder,setQueueOrder]=useState<'newest'|'oldest'>('newest');
  const bookTitles=useMemo(()=>Array.from(new Set(orders.flatMap(order=>order.items.map(item=>item.title)))).sort((a,b)=>a.localeCompare(b)),[orders]);
  const filteredOrders=useMemo(()=>orders.filter(order=>bookFilter==='all'||order.items.some(item=>item.title===bookFilter)).toSorted((a,b)=>{const difference=new Date(a.created_at).getTime()-new Date(b.created_at).getTime();return queueOrder==='oldest'?difference:-difference}),[orders,bookFilter,queueOrder]);
  const revenue=orders.filter(order=>['paid','shipped','completed'].includes(order.status)).reduce((sum,order)=>sum+order.total,0);

  async function orderStatus(id:string,status:string) {
    const previous=orders;
    setOrders(orders.map(order=>order.id===id?{...order,status}:order));
    const response=await fetch('/api/admin/orders',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status})});
    if(!response.ok)setOrders(previous);
  }

  return <>
    <section className="metrics"><div><span>Total claims</span><strong>{orders.length}</strong></div><div><span>Open claims</span><strong>{orders.filter(order=>order.status==='pending_payment').length}</strong></div><div><span>Confirmed sales</span><strong>{peso.format(revenue)}</strong></div></section>
    <section className="admin-section" id="orders">
      <div className="admin-heading"><div><p className="eyebrow">Buyer claims</p><h2>Miner queue</h2></div><span>{filteredOrders.length} of {orders.length}</span></div>
      <div className="queue-filters"><label>Book title<select value={bookFilter} onChange={event=>setBookFilter(event.target.value)}><option value="all">All book titles</option>{bookTitles.map(title=><option value={title} key={title}>{title}</option>)}</select></label><label>Queue order<select value={queueOrder} onChange={event=>setQueueOrder(event.target.value as 'newest'|'oldest')}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div>
      {orders.length?(filteredOrders.length?<div className="order-list">{filteredOrders.map(order=><article key={order.id}><div className="order-top"><div><strong>{order.code}</strong><span>{new Date(order.created_at).toLocaleDateString()}</span></div><select value={order.status} onChange={event=>orderStatus(order.id,event.target.value)} aria-label={`Status for ${order.code}`}><option value="pending_payment">Pending payment</option><option value="paid">Paid</option><option value="shipped">Shipped</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><h3>{order.customer_name}</h3><div className="order-books">{order.items.map((item,index)=><div key={`${item.book_id??'deleted'}-${index}`}><span>{item.title}</span><strong>{ordinal(item.miner_position)} miner</strong></div>)}</div><div className="order-contact"><span>{order.facebook_profile}</span><span>{order.phone}</span><span>{order.delivery_method}</span></div><strong className="order-total">{peso.format(order.total)}</strong></article>)}</div>:<div className="empty-state">No miner claims match these filters.</div>):<div className="empty-state">New buyer claims will appear here.</div>}
    </section>
  </>;
}
