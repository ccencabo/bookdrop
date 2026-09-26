import 'server-only';
import { createAdminClient } from './supabase/admin';
import type { Book, ClaimResult, Order } from './types';

export async function listBooks(includeUnavailable = true, includeScheduled = false): Promise<Book[]> {
  const supabase = createAdminClient();
  let query = supabase.from('books').select('id,title,author,price,is_on_sale,discount_amount,condition,status,tone,description,image_url,image_urls,publish_at').order('publish_at', { ascending:false }).order('created_at', { ascending:false });
  if (!includeUnavailable) query = query.eq('status','available');
  if (!includeScheduled) query = query.lte('publish_at',new Date().toISOString());
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((book) => ({
    ...book,
    image_urls: book.image_urls?.length ? book.image_urls : book.image_url ? [book.image_url] : [],
  })) as Book[];
}

export async function getNextBookPublishAt(): Promise<string|null> {
  const { data,error }=await createAdminClient()
    .from('books')
    .select('publish_at')
    .gt('publish_at',new Date().toISOString())
    .order('publish_at',{ascending:true})
    .limit(1)
    .maybeSingle();
  if(error)throw error;
  return data?.publish_at ?? null;
}

export async function createClaim(input: { bookIds:number[]; name:string; facebook:string; phone:string; delivery:string; address:string; notes:string; }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('create_book_claim', {
    p_book_ids: input.bookIds,
    p_customer_name: input.name,
    p_facebook_profile: input.facebook,
    p_phone: input.phone,
    p_delivery_method: input.delivery,
    p_address: input.address,
    p_notes: input.notes,
  });
  if (error) {
    if (error.message.includes('BOOK_SOLD_OR_UNPUBLISHED')) throw new Error('One of those books is unavailable or has not been published yet. Refresh and try again.');
    if (error.message.includes('BOOK_SOLD')) throw new Error('One of those books was just marked sold. Refresh and try again.');
    throw new Error(error.message);
  }
  const row = (data as { claim_code:string; claim_total:number; claim_items:ClaimResult['items'] }[] | null)?.[0];
  if (!row) throw new Error('The claim could not be created.');
  return { code:row.claim_code, total:row.claim_total, items:row.claim_items };
}

export async function listOrders(): Promise<Order[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('orders').select('*,order_items(book_id,book_title,miner_position,books(title))').order('created_at',{ascending:false});
  if (error) throw error;
  return (data ?? []).map((row) => {
    const raw = row as unknown as Omit<Order,'items'> & { order_items:{book_id:number|null;book_title:string;miner_position:number;books:{title:string}|null}[] };
    return {
      ...raw,
      items: raw.order_items
        .map((item) => ({book_id:item.book_id,title:item.books?.title??item.book_title,miner_position:item.miner_position})),
    };
  });
}

export async function addBook(input: Omit<Book,'id'|'status'>) {
  const { error } = await createAdminClient().from('books').insert(input);
  if (error) throw error;
}

export async function updateBook(id:number,input:Omit<Book,'id'|'status'>) {
  const { error } = await createAdminClient().from('books').update(input).eq('id',id);
  if (error) throw error;
}

export async function setBookStatus(id:number,status:Book['status']) {
  const { error } = await createAdminClient().from('books').update({status}).eq('id',id);
  if (error) throw error;
}

export async function setBookStatuses(ids:number[],status:Book['status']) {
  const { error } = await createAdminClient().from('books').update({status}).in('id',ids);
  if (error) throw error;
}

export async function setOrderStatus(id:string,status:string) {
  const { error } = await createAdminClient().from('orders').update({status}).eq('id',id);
  if (error) throw error;
}
