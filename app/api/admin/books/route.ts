import { addBook, listBooks, setBookStatus, updateBook } from '../../../../lib/data';
import { createAdminClient } from '../../../../lib/supabase/admin';
import type { Book } from '../../../../lib/types';
import { requireOwnerApi } from '../../../admin-auth';

const coverPathPattern = /^covers\/[0-9a-f-]+\.(?:jpg|png|webp)$/;
const MAX_IMAGES = 8;

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

export async function GET() { const auth = await requireOwnerApi(); if ('error' in auth) return auth.error; return Response.json(await listBooks()); }
export async function POST(request:Request) {
  const auth = await requireOwnerApi(); if ('error' in auth) return auth.error;
  const body = await request.json() as Partial<Book> & {image_paths?:string[]};
  if (!body.title?.trim() || !body.author?.trim() || !Number.isFinite(Number(body.price))) return Response.json({error:'Title, author, and price are required.'},{status:400});
  const imagePaths=Array.isArray(body.image_paths)?body.image_paths.map(String):[];
  if(imagePaths.length>MAX_IMAGES||imagePaths.some((path)=>!coverPathPattern.test(path))) return Response.json({error:'Invalid cover photos.'},{status:400});
  const supabase=createAdminClient();
  const imageUrls=imagePaths.map((path)=>supabase.storage.from('book-covers').getPublicUrl(path).data.publicUrl);
  try {
    await addBook({title:body.title.trim().slice(0,120),author:body.author.trim().slice(0,100),price:Number(body.price),condition:String(body.condition||'Good').slice(0,40),tone:String(body.tone||'coral').slice(0,20),description:String(body.description||'').slice(0,400),image_url:imageUrls[0]??null,image_urls:imageUrls});
    return Response.json({ok:true},{status:201});
  } catch(reason) {
    if(imagePaths.length) await supabase.storage.from('book-covers').remove(imagePaths);
    console.error('Could not add book',reason);
    return Response.json({error:'Could not add book.'},{status:500});
  }
}
export async function PATCH(request:Request) {
  const auth = await requireOwnerApi(); if ('error' in auth) return auth.error;
  const body = await request.json() as Partial<Book> & {action?:string;image_paths?:string[];existing_image_urls?:string[]};
  const id=Number(body.id);
  if(!Number.isInteger(id))return Response.json({error:'Invalid update.'},{status:400});
  if(body.action!=='edit') {
    if(!['available','sold'].includes(String(body.status)))return Response.json({error:'Invalid update.'},{status:400});
    await setBookStatus(id,body.status!);
    return Response.json({ok:true});
  }

  if(!body.title?.trim()||!body.author?.trim()||!Number.isFinite(Number(body.price)))return Response.json({error:'Title, author, and price are required.'},{status:400});
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
    await updateBook(id,{title:body.title.trim().slice(0,120),author:body.author.trim().slice(0,100),price:Number(body.price),condition:String(body.condition||'Good').slice(0,40),tone:String(body.tone||'coral').slice(0,20),description:String(body.description||'').slice(0,400),image_url:imageUrls[0]??null,image_urls:imageUrls});
    if(removedPaths.length)await supabase.storage.from('book-covers').remove(removedPaths);
    return Response.json({ok:true});
  } catch(reason) {
    if(imagePaths.length)await supabase.storage.from('book-covers').remove(imagePaths);
    console.error('Could not update book',reason);
    return Response.json({error:'Could not update book.'},{status:500});
  }
}
