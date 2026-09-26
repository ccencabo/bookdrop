import { getChatGPTUser } from './chatgpt-auth';
import { ownerEmail } from '../db/store';

export async function requireOwnerApi() {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({error:'Please sign in first.'},{status:401}) };
  const owner = await ownerEmail();
  if (!owner || owner !== user.email.toLowerCase()) return { error: Response.json({error:'Seller access required.'},{status:403}) };
  return { user };
}
