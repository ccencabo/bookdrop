import { getChatGPTUser } from '../../../chatgpt-auth';
import { claimOwnership, ownerEmail } from '../../../../db/store';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({signedIn:false},{status:401});
  const owner = await ownerEmail();
  return Response.json({signedIn:true,configured:Boolean(owner),isOwner:owner === user.email.toLowerCase(),email:user.email});
}

export async function POST(request:Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({error:'Please sign in first.'},{status:401});
  const { code } = await request.json() as {code?:string};
  try {
    const ok = await claimOwnership(user.email,String(code ?? ''));
    if (!ok) return Response.json({error:'This shop already has an owner.'},{status:403});
    return Response.json({ok:true});
  } catch (reason) { return Response.json({error:reason instanceof Error ? reason.message : 'Setup failed.'},{status:400}); }
}
