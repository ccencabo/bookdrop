import 'server-only';
import { createAdminClient } from './supabase/admin';
import type { Book, ClaimResult, Order } from './types';

export async function listBooks(includeUnavailable = true): Promise<Book[]> {
  const supabase = createAdminClient();
  let query = supabase.from('books').select('id,title,author,price,condition,status,tone,description,image_url').order('created_at', { ascending:false });
  if (!includeUnavailable) query = query.eq('status','available');
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Book[];
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
  if (error) throw new Error(error.message.includes('BOOK_SOLD') ? 'One of those books was just marked sold. Refresh and try again.' : error.message);
  const row = (data as { claim_code:string; claim_total:number; claim_items:ClaimResult['items'] }[] | null)?.[0];
  if (!row) throw new Error('The claim could not be created.');
  return { code:row.claim_code, total:row.claim_total, items:row.claim_items };
}

export async function listOrders(): Promise<Order[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('orders').select('*,order_items(book_id,miner_position,books(title))').order('created_at',{ascending:false});
  if (error) throw error;
  return (data ?? []).map((row) => {
    const raw = row as unknown as Omit<Order,'items'> & { order_items:{book_id:number;miner_position:number;books:{title:string}|null}[] };
    return {
      ...raw,
      items: raw.order_items
        .filter((item) => item.books)
        .map((item) => ({book_id:item.book_id,title:item.books!.title,miner_position:item.miner_position})),
    };
  });
}

export async function addBook(input: Omit<Book,'id'|'status'>) {
  const { error } = await createAdminClient().from('books').insert(input);
  if (error) throw error;
}

export async function setBookStatus(id:number,status:Book['status']) {
  const { error } = await createAdminClient().from('books').update({status}).eq('id',id);
  if (error) throw error;
}

export async function setOrderStatus(id:string,status:string) {
  const { error } = await createAdminClient().from('orders').update({status}).eq('id',id);
  if (error) throw error;
}
