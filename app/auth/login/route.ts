import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function POST(request:Request) {
  const form=await request.formData();
  const email=String(form.get('email')??'').trim();
  const password=String(form.get('password')??'');
  const supabase=await createClient();
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error) return NextResponse.redirect(new URL(`/owner/login?error=${encodeURIComponent('Incorrect email or password.')}`,request.url),303);
  return NextResponse.redirect(new URL('/owner',request.url),303);
}
