# Lumio — Deployment Guide

Follow these steps in order. Takes about 30–45 minutes total.

---

## Step 1 — Push to GitHub

1. Create a new repository on github.com called `lumio` (private is fine)
2. In your terminal, inside the `lumio` folder:

```bash
git init
git add .
git commit -m "Initial Lumio commit"
git remote add origin https://github.com/YOUR_USERNAME/lumio.git
git push -u origin main
```

---

## Step 2 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
   - Name: `lumio`
   - Region: **Sydney (ap-southeast-2)** — closest to Australia
   - Generate a strong database password and save it somewhere

2. Wait for the project to provision (~2 minutes)

3. Go to **SQL Editor** and paste the entire contents of `supabase/migrations/001_initial.sql` — click **Run**

4. Go to **Authentication → Providers** and enable:
   - **Email** (already on by default)
   - **Google** — you'll need a Google OAuth client ID and secret
     - Go to [console.cloud.google.com](https://console.cloud.google.com)
     - Create a project → APIs & Services → Credentials → OAuth 2.0 Client ID
     - Application type: Web application
     - Authorised redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
     - Copy the Client ID and Secret back into Supabase

5. Go to **Settings → API** and copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)

---

## Step 3 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `lumio` GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` (add after first deploy) |
| `DEEPSEEK_API_KEY` | Your DeepSeek key from platform.deepseek.com |

> **AI key options** — add ONE of these:
> - `DEEPSEEK_API_KEY` — recommended, cheapest
> - `ANTHROPIC_API_KEY` — Claude, higher quality
> - `OPENAI_API_KEY` — GPT-4o-mini
> - `GEMINI_API_KEY` — free tier available

5. Click **Deploy** — first build takes ~2 minutes

6. Once deployed, copy your Vercel URL (e.g. `https://lumio-abc123.vercel.app`)
   - Go back to Vercel → Settings → Environment Variables
   - Update `NEXT_PUBLIC_APP_URL` to your actual Vercel URL
   - Redeploy (Deployments → ⋯ → Redeploy)

---

## Step 4 — Connect Supabase to your Vercel URL

1. In Supabase go to **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel URL: `https://lumio-abc123.vercel.app`
3. Add to **Redirect URLs**: `https://lumio-abc123.vercel.app/api/auth/callback`

---

## Step 5 — Test it

1. Open your Vercel URL
2. Click **Start your free 14-day trial**
3. Create an account with your email
4. Confirm in Supabase → **Authentication → Users** that you appear
5. Try the AI tutor — should work immediately

---

## Custom domain (optional, ~$15/yr)

1. Buy a domain at Namecheap, Cloudflare, or Porkbun
2. In Vercel → Settings → Domains → Add Domain
3. Follow Vercel's DNS instructions (usually takes 5 minutes to propagate)

---

## Ongoing costs

| Service | Cost |
|---------|------|
| Vercel | Free (Hobby tier covers this easily) |
| Supabase | Free up to 500MB database, 1GB storage |
| DeepSeek AI | ~$0.001 per request — essentially free at small scale |
| Domain | ~$15 AUD/year |

**Total to launch: $0 unless you buy a domain.**

---

## When you're ready for payments (Stripe)

The codebase is already structured for it. When you want to add subscriptions:
1. Create a Stripe account
2. Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel
3. Ask Claude to add the Stripe checkout flow — the trial/subscription logic is already in the DB

