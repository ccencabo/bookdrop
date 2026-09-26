import { listSellerUpdates } from '../../../../lib/data';
import { createAdminClient } from '../../../../lib/supabase/admin';
import type { SellerUpdate } from '../../../../lib/types';
import { requireOwnerApi } from '../../../admin-auth';

const BUCKET='update-images';
const updatePathPattern=/^updates\/[0-9a-f-]+\.(?:jpg|png|webp)$/;

function storagePathFromPublicUrl(value:string) {
  try {
    const marker='/storage/v1/object/public/update-images/';
    const pathname=new URL(value).pathname;
    const markerIndex=pathname.indexOf(marker);
    if(markerIndex<0)return null;
    const path=decodeURIComponent(pathname.slice(markerIndex+marker.length));
    return updatePathPattern.test(path)?path:null;
  } catch {
    return null;
  }
}

export async function GET() {
  const auth=await requireOwnerApi();
  if('error' in auth)return auth.error;
  return Response.json(await listSellerUpdates());
}

export async function POST(request:Request) {
  const auth=await requireOwnerApi();
  if('error' in auth)return auth.error;
  const body=await request.json() as Partial<SellerUpdate>&{image_path?:string};
  const title=String(body.title??'').trim().slice(0,120);
  const updateBody=String(body.body??'').trim().slice(0,2000);
  const imagePath=body.image_path?String(body.image_path):null;
  if(!title||!updateBody)return Response.json({error:'A title and update message are required.'},{status:400});
  if(imagePath&&!updatePathPattern.test(imagePath))return Response.json({error:'Invalid update photo.'},{status:400});

  const supabase=createAdminClient();
  const imageUrl=imagePath?supabase.storage.from(BUCKET).getPublicUrl(imagePath).data.publicUrl:null;
  const {data,error}=await supabase.from('seller_updates').insert({title,body:updateBody,image_url:imageUrl}).select('id,title,body,image_url,created_at').single();
  if(error) {
    if(imagePath)await supabase.storage.from(BUCKET).remove([imagePath]);
    console.error('Could not post seller update',error);
    return Response.json({error:'Could not post the update.'},{status:500});
  }
  return Response.json(data satisfies SellerUpdate,{status:201});
}

export async function DELETE(request:Request) {
  const auth=await requireOwnerApi();
  if('error' in auth)return auth.error;
  const body=await request.json().catch(()=>null) as {id?:number}|null;
  const id=Number(body?.id);
  if(!Number.isInteger(id)||id<1)return Response.json({error:'Invalid update.'},{status:400});

  const supabase=createAdminClient();
  const {data:stored,error:lookupError}=await supabase.from('seller_updates').select('image_url').eq('id',id).maybeSingle();
  if(lookupError)return Response.json({error:'Could not find the update.'},{status:500});
  if(!stored)return Response.json({error:'The update no longer exists.'},{status:404});
  const {error:deleteError}=await supabase.from('seller_updates').delete().eq('id',id);
  if(deleteError)return Response.json({error:'Could not delete the update.'},{status:500});
  const imagePath=stored.image_url?storagePathFromPublicUrl(stored.image_url):null;
  if(imagePath)await supabase.storage.from(BUCKET).remove([imagePath]);
  return Response.json({ok:true});
}
