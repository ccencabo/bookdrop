import { listOrders, setOrderStatus } from '../../../../lib/data';
import { requireOwnerApi } from '../../../admin-auth';

export async function GET() { const auth = await requireOwnerApi(); if ('error' in auth) return auth.error; return Response.json(await listOrders()); }
export async function PATCH(request:Request) {
  const auth = await requireOwnerApi(); if ('error' in auth) return auth.error;
  const body = await request.json() as {id?:string;status?:string};
  const allowed = ['pending_payment','paid','shipped','completed','cancelled'];
  if (!body.id || !allowed.includes(String(body.status))) return Response.json({error:'Invalid update.'},{status:400});
  await setOrderStatus(body.id,String(body.status)); return Response.json({ok:true});
}
