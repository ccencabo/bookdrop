import { addBook, listBooks, setBookStatus, setBookStatuses, updateBook } from '../../../../lib/data';
import { createAdminClient } from '../../../../lib/supabase/admin';
import type { Book } from '../../../../lib/types';
import { requireOwnerApi } from '../../../admin-auth';

const coverPathPattern = /^covers\/[0-9a-f-]+\.(?:jpg|png|webp)$/;
const MAX_IMAGES = 8;

function parsePublishAt(value:unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function storagePathFromPublicUrl(value:string) {
  try {
    const marker='/storage/v1/object/public/book-covers/';
    const pathname=new URL(value).pathname;
    const markerIndex=pathname.indexOf(marker);
    if(markerIndex<0)return null;
    const path=decodeURIComponent(pathname.slice(markerIndex+marker.length));
    return coverPathPattern.test(path)?path:null;
  } catch {
    return null;
  }
}

function parseIds(value:unknown) {
  if(!Array.isArray(value))return null;
  const ids=[...new Set(value.map(Number))];
  if(!ids.length||ids.length>100||ids.some((id)=>!Number.isInteger(id)||id<1))return null;
  return ids;
}

function parseSale(isOnSaleValue:unknown,discountValue:unknown,price:number) {
  const isOnSale=isOnSaleValue===true;
  const discountAmount=isOnSale?Number(discountValue):0;
  if(isOnSale&&(!Number.isInteger(discountAmount)||discountAmount<=0||discountAmount>=price)) {
    return {error:'The sale discount must be a whole peso amount greater than zero and less than the regular price.'} as const;
  }
  return {isOnSale,discountAmount} as const;
}

export async function GET() { const auth = await requireOwnerApi(); if ('error' in auth) return auth.error; return Response.json(await listBooks(true,true)); }
export async function POST(request:Request) {
  const auth = await requireOwnerApi(); if ('error' in auth) return auth.error;
  const body = await request.json() as Partial<Book> & {image_paths?:string[]};
  if (!body.title?.trim() || !body.author?.trim() || !Number.isFinite(Number(body.price))) return Response.json({error:'Title, author, and price are required.'},{status:400});
  const price=Number(body.price);
  const sale=parseSale(body.is_on_sale,body.discount_amount,price);
  if('error' in sale)return Response.json({error:sale.error},{status:400});
  const publishAt=parsePublishAt(body.publish_at);
  if(!publishAt)return Response.json({error:'A valid posting date and time is required.'},{status:400});
  const imagePaths=Array.isArray(body.image_paths)?body.image_paths.map(String):[];
  if(imagePaths.length>MAX_IMAGES||imagePaths.some((path)=>!coverPathPattern.test(path))) return Response.json({error:'Invalid cover photos.'},{status:400});
  const supabase=createAdminClient();
  const imageUrls=imagePaths.map((path)=>supabase.storage.from('book-covers').getPublicUrl(path).data.publicUrl);
  try {
    await addBook({title:body.title.trim().slice(0,120),author:body.author.trim().slice(0,100),price,is_on_sale:sale.isOnSale,discount_amount:sale.discountAmount,condition:String(body.condition||'Good').slice(0,40),tone:String(body.tone||'coral').slice(0,20),description:String(body.description||'').slice(0,400),image_url:imageUrls[0]??null,image_urls:imageUrls,publish_at:publishAt});
    return Response.json({ok:true},{status:201});
  } catch(reason) {
    if(imagePaths.length) await supabase.storage.from('book-covers').remove(imagePaths);
    console.error('Could not add book',reason);
    return Response.json({error:'Could not add book.'},{status:500});
  }
}
export async function PATCH(request:Request) {
  const auth = await requireOwnerApi(); if ('error' in auth) return auth.error;
  const body = await request.json() as Partial<Book> & {action?:string;ids?:number[];image_paths?:string[];existing_image_urls?:string[]};
  if(body.action==='bulk-status') {
    const ids=parseIds(body.ids);
    if(!ids||!['available','sold'].includes(String(body.status)))return Response.json({error:'Invalid bulk update.'},{status:400});
    try {
      await setBookStatuses(ids,body.status!);
      return Response.json({ok:true});
    } catch(reason) {
      console.error('Could not update books',reason);
      return Response.json({error:'Could not update the selected books.'},{status:500});
    }
  }
  const id=Number(body.id);
  if(!Number.isInteger(id))return Response.json({error:'Invalid update.'},{status:400});
  if(body.action!=='edit') {
    if(!['available','sold'].includes(String(body.status)))return Response.json({error:'Invalid update.'},{status:400});
    await setBookStatus(id,body.status!);
    return Response.json({ok:true});
  }

  if(!body.title?.trim()||!body.author?.trim()||!Number.isFinite(Number(body.price)))return Response.json({error:'Title, author, and price are required.'},{status:400});
  const price=Number(body.price);
  const sale=parseSale(body.is_on_sale,body.discount_amount,price);
  if('error' in sale)return Response.json({error:sale.error},{status:400});
  const publishAt=parsePublishAt(body.publish_at);
  if(!publishAt)return Response.json({error:'A valid posting date and time is required.'},{status:400});
  const imagePaths=Array.isArray(body.image_paths)?body.image_paths.map(String):[];
  const keptUrls=Array.isArray(body.existing_image_urls)?body.existing_image_urls.map(String):[];
  if(imagePaths.length+keptUrls.length>MAX_IMAGES||imagePaths.some((path)=>!coverPathPattern.test(path)))return Response.json({error:'Invalid cover photos.'},{status:400});

  const supabase=createAdminClient();
  const {data:storedBook,error:lookupError}=await supabase.from('books').select('image_url,image_urls').eq('id',id).single();
  if(lookupError||!storedBook)return Response.json({error:'Book not found.'},{status:404});
  const currentUrls:string[]=storedBook.image_urls?.length?storedBook.image_urls:storedBook.image_url?[storedBook.image_url]:[];
  const currentUrlSet=new Set(currentUrls);
  if(keptUrls.some((url)=>!currentUrlSet.has(url)))return Response.json({error:'Invalid existing photos.'},{status:400});

  const newUrls=imagePaths.map((path)=>supabase.storage.from('book-covers').getPublicUrl(path).data.publicUrl);
  const imageUrls=[...keptUrls,...newUrls];
  const removedPaths=currentUrls.filter((url)=>!keptUrls.includes(url)).flatMap((url)=>{const path=storagePathFromPublicUrl(url);return path?[path]:[]});
  try {
    await updateBook(id,{title:body.title.trim().slice(0,120),author:body.author.trim().slice(0,100),price,is_on_sale:sale.isOnSale,discount_amount:sale.discountAmount,condition:String(body.condition||'Good').slice(0,40),tone:String(body.tone||'coral').slice(0,20),description:String(body.description||'').slice(0,400),image_url:imageUrls[0]??null,image_urls:imageUrls,publish_at:publishAt});
    if(removedPaths.length)await supabase.storage.from('book-covers').remove(removedPaths);
    return Response.json({ok:true});
  } catch(reason) {
    if(imagePaths.length)await supabase.storage.from('book-covers').remove(imagePaths);
    console.error('Could not update book',reason);
    return Response.json({error:'Could not update book.'},{status:500});
  }
}


export async function DELETE(request:Request) {
  const auth = await requireOwnerApi(); if ('error' in auth) return auth.error;
  const body = await request.json().catch(()=>null) as {ids?:number[]}|null;
  const ids=parseIds(body?.ids);
  if(!ids)return Response.json({error:'Choose at least one valid book to delete.'},{status:400});

  const supabase=createAdminClient();
  const {data:storedBooks,error:lookupError}=await supabase.from('books').select('id,title,status,image_url,image_urls').in('id',ids);
  if(lookupError)return Response.json({error:'Could not find the selected books.'},{status:500});
  if(!storedBooks?.length)return Response.json({error:'The selected books no longer exist.'},{status:404});

  const {data:claimedItems,error:claimsError}=await supabase.from('order_items').select('book_id').in('book_id',ids);
  if(claimsError)return Response.json({error:'Could not check buyer claims for the selected books.'},{status:500});
  const claimedIds=new Set((claimedItems??[]).map((item)=>Number(item.book_id)));
  const claimedUnsoldBooks=storedBooks.filter((book)=>book.status!=='sold'&&claimedIds.has(Number(book.id)));
  if(claimedUnsoldBooks.length) {
    return Response.json({error:'Books with buyer claims must be marked sold before they can be deleted.'},{status:409});
  }

  const {data:deletedBooks,error:deleteError}=await supabase.from('books').delete().in('id',ids).select('id');
  if(deleteError) {
    if(deleteError.code==='23503')return Response.json({error:'Could not preserve the buyer claims while deleting these books. Apply the latest database migration and try again.'},{status:409});
    console.error('Could not delete books',deleteError);
    return Response.json({error:'Could not delete the selected books.'},{status:500});
  }

  const deletedIds=(deletedBooks??[]).map((book)=>Number(book.id));
  const deletedIdSet=new Set(deletedIds);
  const imagePaths=[...new Set(storedBooks
    .filter((book)=>deletedIdSet.has(Number(book.id)))
    .flatMap((book)=>book.image_urls?.length?book.image_urls:book.image_url?[book.image_url]:[])
    .flatMap((url)=>{const path=storagePathFromPublicUrl(url);return path?[path]:[]}))];
  if(imagePaths.length) {
    const {error:storageError}=await supabase.storage.from('book-covers').remove(imagePaths);
    if(storageError)console.error('Books deleted, but some cover photos could not be removed',storageError);
  }
  return Response.json({ok:true,deletedIds});
}
