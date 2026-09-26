import { requireOwnerApi } from '../../../admin-auth';
import { createAdminClient } from '../../../../lib/supabase/admin';

const BUCKET = 'book-covers';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 8;
const extensions: Record<string,string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function ensureCoverBucket() {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: Object.keys(extensions),
    });
    if (error && !error.message.toLowerCase().includes('already exists')) throw error;
  }
  return supabase;
}

type UploadRequest = { type?:string; size?:number; files?:{type?:string;size?:number}[] };

export async function POST(request:Request) {
  const auth = await requireOwnerApi();
  if ('error' in auth) return auth.error;

  const body = await request.json() as UploadRequest;
  const files = body.files ?? [{type:body.type,size:body.size}];
  if (files.length < 1 || files.length > MAX_IMAGES) return Response.json({error:`Choose between 1 and ${MAX_IMAGES} photos.`},{status:400});
  for (const file of files) {
    if (!extensions[String(file.type ?? '')]) return Response.json({error:'Please choose only JPG, PNG, or WebP images.'},{status:400});
    const size = Number(file.size);
    if (!Number.isFinite(size) || size < 1 || size > MAX_FILE_SIZE) return Response.json({error:'Each cover photo must be 5 MB or smaller.'},{status:400});
  }

  try {
    const supabase = await ensureCoverBucket();
    const uploads = await Promise.all(files.map(async (file) => {
      const type = String(file.type);
      const path = `covers/${crypto.randomUUID()}.${extensions[type]}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error) throw error;
      return {path,token:data.token};
    }));
    return Response.json({uploads});
  } catch (reason) {
    console.error('Could not prepare book cover upload', reason);
    return Response.json({error:'Could not prepare the photo upload.'},{status:500});
  }
}

export async function DELETE(request:Request) {
  const auth = await requireOwnerApi();
  if ('error' in auth) return auth.error;
  const body = await request.json() as {paths?:string[]};
  const paths = (body.paths ?? []).filter((path) => /^covers\/[0-9a-f-]+\.(?:jpg|png|webp)$/.test(path)).slice(0,MAX_IMAGES);
  if (paths.length) await createAdminClient().storage.from(BUCKET).remove(paths);
  return Response.json({ok:true});
}
