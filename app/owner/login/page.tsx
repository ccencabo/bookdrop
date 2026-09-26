export const dynamic = 'force-dynamic';

export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const {error}=await searchParams;
  return <main className="owner-shell"><section className="setup-card"><a href="/" className="brand"><span className="brand-mark">D</span><span>Dog-Eared Books</span></a><p className="eyebrow">Seller dashboard</p><h1>Welcome back.</h1><p>Sign in with the seller account you created in Supabase.</p><form action="/auth/login" method="post"><label>Email<input name="email" type="email" required autoComplete="email" autoFocus /></label><label>Password<input name="password" type="password" required autoComplete="current-password" /></label>{error&&<p className="form-error">{error}</p>}<button className="submit-claim">Sign in</button></form></section></main>;
}
