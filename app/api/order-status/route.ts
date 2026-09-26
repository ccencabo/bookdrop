import { createAdminClient } from '../../../lib/supabase/admin';
import type { PublicOrderStatus } from '../../../lib/types';

const codePattern=/^READ-[A-Z0-9]{7}$/;

export async function POST(request:Request) {
  const body=await request.json().catch(()=>null) as {code?:string}|null;
  const code=String(body?.code??'').trim().toUpperCase();
  if(!codePattern.test(code))return Response.json({error:'Enter a valid claim code.'},{status:400});

  const {data,error}=await createAdminClient()
    .from('orders')
    .select('code,status,tracking_number,status_updated_at,created_at,order_items(book_title,books(title))')
    .eq('code',code)
    .maybeSingle();
  if(error) {
    console.error('Could not look up claim status',error);
    return Response.json({error:'Could not check the claim right now.'},{status:500});
  }
  if(!data)return Response.json({error:'No claim was found with that code.'},{status:404});

  const raw=data as unknown as {
    code:string;
    status:string;
    tracking_number:string|null;
    status_updated_at:string;
    created_at:string;
    order_items:{book_title:string;books:{title:string}|null}[];
  };
  const result:PublicOrderStatus={
    code:raw.code,
    status:raw.status,
    tracking_number:raw.tracking_number,
    status_updated_at:raw.status_updated_at,
    created_at:raw.created_at,
    items:raw.order_items.map((item)=>item.books?.title??item.book_title),
  };
  return Response.json(result);
}
