import { addBook, listBooks, setBookStatus, type Book } from '../../../../db/store';
import { requireOwnerApi } from '../../../admin-auth';

export async function GET() { const auth = await requireOwnerApi(); if ('error' in auth) return auth.error; return Response.json(await listBooks()); }
export async function POST(request:Request) {
  const auth = await requireOwnerApi(); if ('error' in auth) return auth.error;
  const body = await request.json() as Partial<Book>;
  if (!body.title?.trim() || !body.author?.trim() || !Number.isFinite(Number(body.price))) return Response.json({error:'Title, author, and price are required.'},{status:400});
  await addBook({title:body.title.trim().slice(0,120),author:body.author.trim().slice(0,100),price:Number(body.price),condition:String(body.condition||'Good').slice(0,40),tone:String(body.tone||'coral').slice(0,20),description:String(body.description||'').slice(0,400)});
  return Response.json({ok:true},{status:201});
}
export async function PATCH(request:Request) {
  const auth = await requireOwnerApi(); if ('error' in auth) return auth.error;
  const body = await request.json() as {id?:number;status?:Book['status']};
  if (!Number.isInteger(body.id) || !['available','reserved','sold'].includes(String(body.status))) return Response.json({error:'Invalid update.'},{status:400});
  await setBookStatus(Number(body.id),body.status!); return Response.json({ok:true});
}
