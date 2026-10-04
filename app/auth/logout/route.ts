import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function POST(request:Request) {
  const baseUrl=process.env.SITE_URL?.trim()||request.url;
  const supabase=await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/',baseUrl),303);
}
