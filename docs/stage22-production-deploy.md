# Stage 22 production deployment runbook

This runbook does not contain production credentials. The owner enters secrets in
the Render and Vercel dashboards.

## Chosen production targets

- Frontend: the existing Vercel project,
  `https://stroy-rayon-react.vercel.app`.
- Backend: Render web service in Frankfurt, defined by `render.yaml`.
- Database: Render PostgreSQL in Frankfurt, defined by `render.yaml`.
- Final frontend domains: `stroyrayon.kg` and `www.stroyrayon.kg`.
- Final API domain: `api.stroyrayon.kg`.

The Blueprint intentionally uses paid production-sized defaults:
Render `starter` for the API and `basic-256mb` for PostgreSQL. The owner must
review current pricing before creating the resources.

## 1. Deploy PostgreSQL and the API on Render

1. Sign in to Render with the GitHub account that can read
   `Adyl-1991/StroyRayon-React`.
2. Choose **New > Blueprint** and connect the repository.
3. Select the root `render.yaml`.
4. Review the paid resources before confirming creation.
5. Enter the values requested by the Blueprint:
   - `ADMIN_INITIAL_EMAIL`
   - `ADMIN_INITIAL_PASSWORD` (at least 12 characters)
   - `ADMIN_INITIAL_NAME`
   - `WHATSAPP_MANAGER_PHONE`
6. Deploy the Blueprint.

The Blueprint performs:

- `npm ci`, Prisma client generation, and NestJS build;
- `npx prisma migrate deploy` before each release;
- the catalog/admin seed on the first successful deployment;
- a health check at `/api/health`;
- private-network-only PostgreSQL access.

After the first deployment:

1. Open `https://<render-service>.onrender.com/api/health`.
2. Check the deploy log for seven applied migrations and a successful seed.
3. Confirm the seed reports 179 products, zero skipped products, and zero
   warnings.
4. Log in once with the bootstrap administrator.
5. Remove `ADMIN_INITIAL_PASSWORD` from the Render service environment.
6. Keep `ADMIN_INITIAL_EMAIL` only if it is useful operationally; later seeds do
   not overwrite an existing password.

## 2. Verify the backend before connecting the frontend

Use the generated `onrender.com` URL first:

```text
GET  /api/health
GET  /api/products
GET  /api/products/:slug
POST /api/orders
POST /api/admin/auth/login
GET  /api/admin/auth/me
GET  /api/admin/orders
GET  /api/admin/products
```

Expected results:

- health reports API and database availability;
- the public products endpoint returns 179 products;
- protected endpoints return `401` without a bearer token;
- admin login works with the bootstrap account;
- order totals use database prices;
- reservations change atomically.

## 3. Repair and configure the Vercel production deployment

The GitHub deployment for Stage 21 failed. In Vercel, open the project and:

1. Inspect deployment `dpl_CYZs8HFV5w43TNcnkcAbZ5K54vpx`.
2. Confirm **Root Directory** is the repository root.
3. Confirm the framework is Vite, build command is `npm run build`, and output
   directory is `dist`.
4. Set production environment variables:
   - `VITE_USE_API=true`
   - `VITE_API_BASE_URL=https://api.stroyrayon.kg/api`
   - `VITE_SITE_URL=https://stroyrayon.kg`
   - `VITE_API_TIMEOUT_MS=5000`
   - `VITE_ADMIN_TOKEN_STORAGE_KEY=stroyrayon_admin_token`
5. Redeploy `main`.

Environment changes only affect a new deployment. If the Git integration still
fails before the build starts, an authenticated owner can use the CLI fallback:

```powershell
npx.cmd vercel@latest login
npx.cmd vercel@latest --prod
```

The committed `.vercelignore` keeps backend and large audit artifacts out of
that CLI frontend upload.

Do not promote the deployment until Home, Catalog, Checkout, `/admin/login`,
`/admin/orders`, and `/admin/products` load against the production API.

## 4. Connect domains and DNS

The domain currently returns NXDOMAIN. Add domains to the hosting dashboards
before creating DNS records.

### Vercel frontend

1. In Vercel **Project > Settings > Domains**, add:
   - `stroyrayon.kg`
   - `www.stroyrayon.kg`
2. Choose `stroyrayon.kg` as the canonical domain and redirect `www` to it.
3. At the authoritative DNS provider, add the exact apex A/ALIAS and `www`
   CNAME values displayed by Vercel.

Do not copy generic Vercel DNS targets if the dashboard displays
project-specific values.

### Render API

1. In the Render service, verify that `api.stroyrayon.kg` appears under Custom
   Domains.
2. At the same authoritative DNS provider, add:

```text
Type: CNAME
Name: api
Value: <exact stroyrayon-api.onrender.com target shown by Render>
TTL: automatic or 300
```

3. Verify the custom domain in Render and wait for its TLS certificate.
4. Recheck `https://api.stroyrayon.kg/api/health`.

DNS propagation can take from minutes to the TTL/provider maximum. Launch status
remains blocked until all three names resolve and HTTPS succeeds.

## 5. Final production E2E

After the API, frontend, and DNS are live, run:

```powershell
$env:STAGE21_FRONTEND_URL='https://stroyrayon.kg'
$env:STAGE21_API_URL='https://api.stroyrayon.kg/api'
$env:STAGE21_ADMIN_EMAIL='<production admin email>'
$env:STAGE21_ADMIN_PASSWORD='<production admin password>'
npm.cmd run qa:stage21
```

Do not save the two credential variables in a file or commit them. Confirm that
the E2E cleanup cancels test orders, releases reservations, and restores product
price/stock/active values.

## 6. Search and analytics

After DNS and the final deployment:

- verify `stroyrayon.kg` in Google Search Console;
- submit `https://stroyrayon.kg/sitemap.xml`;
- configure analytics outside admin routes;
- add conversion events for add-to-cart, checkout submission, WhatsApp click,
  and phone click.
