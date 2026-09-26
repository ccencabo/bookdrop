import { requireOwnerApi } from '../../../admin-auth';
import { createAdminClient } from '../../../../lib/supabase/admin';

const BUCKET='update-images';
const MAX_FILE_SIZE=5*1024*1024;
const extensions:Record<string,string>={
  'image/jpeg':'jpg',
  'image/png':'png',
  'image/webp':'webp',
};
const updatePathPattern=/^updates\/[0-9a-f-]+\.(?:jpg|png|webp)$/;

async function ensureUpdateBucket() {
  const supabase=createAdminClient();
  const {data}=await supabase.storage.getBucket(BUCKET);
  if(!data) {
    const {error}=await supabase.storage.createBucket(BUCKET,{
      public:true,
      fileSizeLimit:MAX_FILE_SIZE,
      allowedMimeTypes:Object.keys(extensions),
    });
    if(error&&!error.message.toLowerCase().includes('already exists'))throw error;
  }
  return supabase;
}

export async function POST(request:Request) {
  const auth=await requireOwnerApi();
  if('error' in auth)return auth.error;
  const body=await request.json() as {type?:string;size?:number};
  const type=String(body.type??'');
  const size=Number(body.size);
  if(!extensions[type])return Response.json({error:'Please choose a JPG, PNG, or WebP image.'},{status:400});
  if(!Number.isFinite(size)||size<1||size>MAX_FILE_SIZE)return Response.json({error:'The update photo must be 5 MB or smaller.'},{status:400});

  try {
    const supabase=await ensureUpdateBucket();
    const path=`updates/${crypto.randomUUID()}.${extensions[type]}`;
    const {data,error}=await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if(error)throw error;
    return Response.json({path,token:data.token});
  } catch(reason) {
    console.error('Could not prepare update image upload',reason);
    return Response.json({error:'Could not prepare the update photo.'},{status:500});
  }
}

export async function DELETE(request:Request) {
  const auth=await requireOwnerApi();
  if('error' in auth)return auth.error;
  const body=await request.json() as {path?:string};
  const path=String(body.path??'');
  if(updatePathPattern.test(path))await createAdminClient().storage.from(BUCKET).remove([path]);
  return Response.json({ok:true});
}
