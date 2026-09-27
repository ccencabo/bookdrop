import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { enforceRateLimit } from '../../../lib/rate-limit';

export async function POST(request:Request) {
  const ipRateLimit=await enforceRateLimit(request,{action:'owner-login-ip',limit:12,windowSeconds:15*60});
  if(ipRateLimit)return ipRateLimit;
  const form=await request.formData();
  const email=String(form.get('email')??'').trim();
  const password=String(form.get('password')??'');
  const accountRateLimit=await enforceRateLimit(request,{action:'owner-login-account',limit:8,windowSeconds:15*60,subject:email});
  if(accountRateLimit)return accountRateLimit;
  const supabase=await createClient();
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error) return NextResponse.redirect(new URL(`/owner/login?error=${encodeURIComponent('Incorrect email or password.')}`,request.url),303);
  return NextResponse.redirect(new URL('/owner/claims',request.url),303);
}
