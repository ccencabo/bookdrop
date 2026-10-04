import { listOrders, updateOrder } from '../../../../lib/data';
import { requireOwnerApi } from '../../../admin-auth';

export async function GET() { const auth = await requireOwnerApi(); if ('error' in auth) return auth.error; return Response.json(await listOrders()); }
export async function PATCH(request:Request) {
  const auth = await requireOwnerApi(); if ('error' in auth) return auth.error;
  const body = await request.json() as {id?:string;status?:string;tracking_number?:string;shipping_fee?:number};
  const allowed = ['pending_payment','paid','shipped','completed','cancelled'];
  const hasStatus=body.status!==undefined;
  const hasShippingFee=body.shipping_fee!==undefined;
  if (!body.id || (!hasStatus&&!hasShippingFee) || (hasStatus&&!allowed.includes(String(body.status)))) return Response.json({error:'Invalid update.'},{status:400});
  const shippingFee=Number(body.shipping_fee);
  if(hasShippingFee&&(!Number.isInteger(shippingFee)||shippingFee<0||shippingFee>100000))return Response.json({error:'Shipping fee must be a whole peso amount between ₱0 and ₱100,000.'},{status:400});
  const trackingNumber=String(body.tracking_number??'').trim().slice(0,100);
  if(body.status==='shipped'&&!trackingNumber)return Response.json({error:'Enter a tracking number before marking this order shipped.'},{status:400});
  try {
    await updateOrder(body.id,{
      status:hasStatus?String(body.status):undefined,
      trackingNumber:hasStatus&&trackingNumber?trackingNumber:undefined,
      shippingFee:hasShippingFee?shippingFee:undefined,
    });
    return Response.json({ok:true});
  } catch(reason) {
    console.error('Could not update order',reason);
    return Response.json({error:'Could not update the order.'},{status:500});
  }
}
