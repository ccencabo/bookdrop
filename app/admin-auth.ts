import { createClient } from '../lib/supabase/server';

export async function getOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!user?.email || !adminEmail || user.email.toLowerCase() !== adminEmail) return null;
  return user;
}

export async function requireOwnerApi() {
  const user = await getOwner();
  if (!user) return { error: Response.json({error:'Seller access required.'},{status:401}) };
  return { user };
}
