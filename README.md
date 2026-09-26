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
- Standard Next.js build plus Docker deployment support

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
SITE_URL=https://books.yourdomain.com
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The seller dashboard is at `http://localhost:3000/owner`.

## 4. Deploy

### Vercel

Import the repository, add the five environment variables above, and deploy. Add your custom domain in the project domain settings.

### Docker / your own server

```bash
docker build -t bookdrop .
docker run --env-file .env.local -p 3000:3000 bookdrop
```

Put Caddy, nginx, or Cloudflare in front of port 3000 and point your domain to the server. Use HTTPS in production.

## Security model

Public buyers can read inventory but cannot directly alter it. Claims go through a server route and an atomic PostgreSQL function. Seller APIs verify a Supabase Auth session and require the email in `ADMIN_EMAIL`. The secret key remains on the server.
