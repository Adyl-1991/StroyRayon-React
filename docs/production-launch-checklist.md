# StroyRayon production launch checklist

## 1. Provision backend and database

Create a managed PostgreSQL database and a persistent Node.js service for `api/`.

Backend commands:

```text
Build: npm ci && npm run prisma:generate && npm run build
Release/migration: npx prisma migrate deploy
Start: npm run start:prod
Health check: GET /api/health
```

Required backend environment names:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=<provided by host>
DATABASE_URL=<managed PostgreSQL URL>
CORS_ORIGIN=https://stroyrayon.kg,https://www.stroyrayon.kg
ADMIN_JWT_SECRET=<unique random 32+ character secret>
ADMIN_JWT_EXPIRES_SECONDS=28800
WHATSAPP_MANAGER_PHONE=<production manager number>
```

For the first production seed only:

```text
ADMIN_INITIAL_EMAIL
ADMIN_INITIAL_PASSWORD
ADMIN_INITIAL_NAME
ADMIN_INITIAL_ROLE=OWNER
```

Run `npm run prisma:seed` once, verify login, then remove
`ADMIN_INITIAL_PASSWORD` from the hosting environment.

## 2. Deploy frontend

Vercel build settings:

```text
Framework: Vite
Install: npm ci
Build: npm run build
Output: dist
Production branch: main
```

Required frontend environment names:

```text
VITE_USE_API=true
VITE_API_BASE_URL=https://api.stroyrayon.kg/api
VITE_SITE_URL=https://stroyrayon.kg
VITE_API_TIMEOUT_MS=5000
VITE_ADMIN_TOKEN_STORAGE_KEY=stroyrayon_admin_token
```

The repository `vercel.json` supplies SPA rewrites, admin noindex, and baseline
security headers.

## 3. Attach domains and DNS

Current audit status on June 19, 2026: `stroyrayon.kg` and
`www.stroyrayon.kg` return DNS `NXDOMAIN`.

Add `stroyrayon.kg` and `www.stroyrayon.kg` in Vercel Project Settings first.
Use the exact DNS values Vercel displays for that project. Common Vercel values
are an apex `A` record and a `www` `CNAME`, but the dashboard result is
authoritative and can be project-specific.

Recommended canonical setup:

- primary: `www.stroyrayon.kg`;
- redirect: `stroyrayon.kg` -> `www.stroyrayon.kg`;
- or keep the current canonical `https://stroyrayon.kg` and configure the
  opposite redirect, then keep `VITE_SITE_URL`, sitemap, and Search Console
  consistent with that choice.

For the backend:

- create `api.stroyrayon.kg`;
- point it to the chosen backend host using the record supplied by that host;
- verify HTTPS before setting `VITE_API_BASE_URL`;
- keep `CORS_ORIGIN` limited to the final frontend origins.

## 4. Go-live verification

- production `/api/health` returns `ok`;
- all migrations are applied;
- seed reports 179 products and zero warnings;
- owner login succeeds;
- Home, Catalog, category, product, search, cart and checkout render;
- checkout creates a database order with authoritative price and reservation;
- admin order status/note/history work;
- admin product price/stock/active controls work;
- unauthenticated admin APIs return 401;
- `robots.txt` and the 343-URL sitemap load over HTTPS;
- canonical URLs use the selected primary domain;
- submit the sitemap in Google Search Console.
