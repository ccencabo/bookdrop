# The Second Chapter

A mobile-friendly secondhand-book storefront with atomic miner queues and a private seller dashboard.

## What is included

- Public catalog that accepts miners until the seller marks a book sold
- Scheduled new-arrival drops that publish together and are grouped by posting date
- Multi-book claim checkout and unique claim codes
- Atomic per-book queue positions for concurrent claims
- Seller login, inventory management, and order-status workflow
- Up to eight Supabase Storage photos per book
- Open Graph sharing card
- Standard Next.js/Docker builds plus Cloudflare Workers deployment support

## 1. Create the Supabase project

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. Open **SQL Editor** and run every file in `supabase/migrations` in filename order.
3. Open **Authentication → Users** and create your seller user.
4. Copy the project URL, publishable key, and secret key from the project settings.

The secret key is server-only. Never prefix it with `NEXT_PUBLIC_` or expose it in browser code.

The app creates its public `book-covers` Storage bucket on the first seller upload. Each image is limited to 5 MB and must be JPG, PNG, or WebP.

## 2. Configure the app

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_key
ADMIN_EMAIL=the-email-you-created-in-supabase@example.com
RATE_LIMIT_SECRET=a-long-random-secret-used-to-hash-rate-limit-identifiers
FACEBOOK_PAGE_URL=https://www.facebook.com/your-page
SITE_URL=https://books.yourdomain.com
```

`RATE_LIMIT_SECRET` should be a unique random value of at least 32 characters. The app stores only keyed hashes of rate-limit identifiers. If you self-host behind a reverse proxy, configure it to replace (not merely append to) client IP forwarding headers.

`FACEBOOK_PAGE_URL` is optional; omit it when the store does not have a Facebook page. The other six values are required in production.

## 3. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The seller dashboard is at `http://localhost:3000/owner`.

## 4. Deploy

### Cloudflare Workers (recommended for this project)

This deploys the application itself to Cloudflare Workers. Cloudflare also provides the DNS, HTTPS certificate, and edge network, while Supabase remains the database, authentication, and file-storage provider. Docker Desktop and an AWS account are not needed for this path.

The repository is already configured for Cloudflare's vinext adapter. Before deploying, make sure `.env.local` exists and contains the six required production values from section 2, plus the optional Facebook URL if applicable. `SITE_URL` must be the final public URL (for example, `https://books.yourdomain.com`), not a Supabase URL.

Authenticate once in a terminal:

```bash
npx cf auth login
```

Then build and deploy:

```bash
npm run deploy:cloudflare
```

The command builds the Worker and securely uploads the values from the ignored `.env.local` file as encrypted Worker secrets. It does not commit that file. Use the same command after changing an environment value so Cloudflare receives the updated value.

After the first deployment:

1. In **Cloudflare Dashboard -> Workers & Pages -> bookdrop -> Settings -> Domains & Routes**, add your custom domain. Cloudflare creates the appropriate DNS route and manages HTTPS when the domain is in your Cloudflare zone.
2. In **Supabase Dashboard -> Authentication -> URL Configuration**, set **Site URL** to the same `SITE_URL`. Add the same origin to **Redirect URLs** (for example, `https://books.yourdomain.com/**`).
3. If the first deployment used the temporary `workers.dev` URL, replace `SITE_URL` in `.env.local` with the custom HTTPS URL and run `npm run deploy:cloudflare` again.
4. Test the public catalog, seller login/logout, image upload, checkout/claim, and order lookup on the production domain.

To generate `RATE_LIMIT_SECRET` in a terminal, use:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep the generated value private. `NEXT_PUBLIC_SUPABASE_URL` comes from **Supabase Dashboard -> Project Settings -> API**, not from Cloudflare.

### Vercel

Import the repository, add the seven environment variables above, and deploy. Add your custom domain in the project domain settings.

### Docker / your own server

```bash
docker build -t bookdrop .
docker run --env-file .env.local -p 3000:3000 bookdrop
```

Put Caddy, nginx, or Cloudflare in front of port 3000 and point your domain to the server. Use HTTPS in production.

## Security model

Public buyers can read inventory but cannot directly alter it. Claims go through a server route and an atomic PostgreSQL function. Seller APIs verify a Supabase Auth session and require the email in `ADMIN_EMAIL`. The secret key remains on the server.

Public claim creation, order tracking, and seller sign-in are protected by database-backed rate limits. Apply every migration, including `20260926000000_launch_hardening.sql`, before deploying the matching application version.
