# Rangao — রাঙাও | প্রিমিয়াম ইসলামিক ও হোম ডেকোর

**Live Site**: [https://www.rangao.bd](https://www.rangao.bd)

Rangao (রাঙাও) is Bangladesh's premier Islamic wall art, wooden décor, canvas, and lifestyle décor online shop. This repository contains the full-stack e-commerce web application.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Hosting**: Vercel (with Cloudflare CDN)
- **Payments**: bKash / Nagad (custom integration)

## Local Development

```sh
# Install dependencies
npm install

# Start dev server (http://localhost:8080)
npm run dev

# Build for production
npm run build
```

## Deployment

Push to the `main` branch — Vercel auto-deploys with:
- `npm install`
- `npm run build` (Vite)
- Output: `dist/`

## Environment Variables

Required in Vercel project settings:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GA_ID=
VITE_FB_PIXEL_ID=
VITE_TIKTOK_PIXEL_ID=
```

## Project Structure

```
src/
  components/   # Reusable UI components
  pages/        # Route pages (customer + admin)
  hooks/        # Custom React hooks
  lib/          # Supabase client, utilities, integrations
api/            # Vercel serverless functions (sitemap, robots, ping)
supabase/       # Database migrations & RLS policies
public/         # Static assets
workers/        # Cloudflare Worker (image proxy)
```
