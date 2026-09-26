import { listOrders, setOrderStatus } from '../../../../lib/data';
import { requireOwnerApi } from '../../../admin-auth';

export async function GET() { const auth = await requireOwnerApi(); if ('error' in auth) return auth.error; return Response.json(await listOrders()); }
export async function PATCH(request:Request) {
  const auth = await requireOwnerApi(); if ('error' in auth) return auth.error;
  const body = await request.json() as {id?:string;status?:string;tracking_number?:string};
  const allowed = ['pending_payment','paid','shipped','completed','cancelled'];
  if (!body.id || !allowed.includes(String(body.status))) return Response.json({error:'Invalid update.'},{status:400});
  const trackingNumber=String(body.tracking_number??'').trim().slice(0,100);
  if(body.status==='shipped'&&!trackingNumber)return Response.json({error:'Enter a tracking number before marking this order shipped.'},{status:400});
  try {
    await setOrderStatus(body.id,String(body.status),trackingNumber||undefined);
    return Response.json({ok:true});
  } catch(reason) {
    console.error('Could not update order status',reason);
    return Response.json({error:'Could not update the order.'},{status:500});
  }
}
