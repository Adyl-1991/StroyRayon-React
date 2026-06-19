# Stage 27 — Owner-Assisted Production Deploy Attempt

Audit date: 2026-06-19
Baseline commit: `074cfda9de7bc4d8f7601a1bedac8fbcc874deba`

## 1. Summary

An owner-assisted production deployment was attempted without inventing
credentials or infrastructure state.

Results:

- Vercel CLI owner session is available as `adyl-1991`;
- the Vercel project `stroy-rayon-react` is accessible;
- the Vercel Production environment currently has no variables;
- Render API/CLI authentication is not available on this workstation;
- the Render Blueprint creation page was opened in Google Chrome for the owner;
- no Render service, PostgreSQL database, migrations, seed, or backend URL can
  be verified yet;
- Vercel API variables were not set because no real backend URL exists;
- the live frontend still contains the localhost API fallback.

No secret was requested in chat, printed, stored, or committed. No guessed
Render URL was used.

## 2. Access status

### Render

Status: **dashboard/API access missing for the agent**.

Verified:

- `RENDER_API_KEY`: not set;
- `RENDER_TOKEN`: not set;
- Render CLI: not installed;
- local Render authentication path: not present.

Owner assistance:

- Chrome was opened to the Render Blueprint creation page for
  `Adyl-1991/StroyRayon-React`;
- the owner must sign in, approve resource plans, and enter dashboard-only
  values.

### Vercel

Status: **owner CLI access available**.

Verified:

- `vercel whoami`: `adyl-1991`;
- project: `adyl-1991s-projects/stroy-rayon-react`;
- framework: Vite;
- root directory: repository root;
- latest production URL: `https://stroy-rayon-react.vercel.app`;
- Production environment variables: none.

Vercel access alone cannot complete the connection because
`VITE_API_BASE_URL` requires the real Render backend URL.

## 3. Render deployment status

Status: **not deployed**.

Repository input is ready:

- repository: `Adyl-1991/StroyRayon-React`;
- branch: `main`;
- Blueprint: root `render.yaml`;
- web service: `stroyrayon-api`;
- database: `stroyrayon-postgres`;
- web/database region: Frankfurt;
- API health path: `/api/health`.

The owner must complete the Render UI:

1. Sign in to Render.
2. Choose **New > Blueprint**.
3. Select the repository and `main`.
4. Confirm `render.yaml`.
5. Review `starter` web and `basic-256mb` PostgreSQL plans/current pricing.
6. Enter the requested administrator and WhatsApp values.
7. Create/apply the Blueprint.
8. Wait for build, migration, service start, health, and initial seed.

## 4. PostgreSQL status

Status: **not created / not verified**.

The Blueprint is ready to create managed PostgreSQL and inject its internal
connection string as `DATABASE_URL`.

The owner must verify in Render:

- database status is available;
- web service and database use the same region;
- the API receives the internal connection string;
- no database password is copied into Git;
- backups/retention match the selected Render plan.

## 5. Migration status

Status: **not run in production**.

Configured command:

```text
cd api && npx prisma migrate deploy
```

It runs as Render `preDeployCommand`, after build and before service start.

Owner verification:

- deploy log reports seven migrations;
- migrations apply successfully or report no pending migrations;
- no `prisma migrate dev` command is used in production.

Local Prisma validation/migration status is not proof of production success.

## 6. Seed/import status

Status: **not run in production**.

Configured initial command:

```text
cd api && npm run prisma:seed
```

It runs as Render `initialDeployHook` after the first successful service
deployment.

Expected log result:

- 179 products;
- zero skipped products;
- zero warnings;
- catalog nodes, brands, product images, relations, and stock records ready;
- initial administrator ready.

The seed uses upsert/update behavior and does not duplicate products on a
normal rerun. It also synchronizes/removes stale catalog products, so production
reruns must be intentional and log-reviewed.

## 7. Backend public URL

Status: **not available**.

Current checks:

- `api.stroyrayon.kg`: NXDOMAIN/unresolved;
- guessed `https://stroyrayon-api.onrender.com/api/health`: HTTP 404.

The guessed hostname is not a valid backend URL and must not be used.

After Render finishes, copy the exact URL from the service page:

```text
https://<exact-render-service>.onrender.com
```

## 8. Backend API verification

Status: **not run in production**.

Use actual repository routes:

```bash
curl -i https://<exact-render-service>.onrender.com/api/health
curl -i https://<exact-render-service>.onrender.com/api/catalog/tree
curl -i https://<exact-render-service>.onrender.com/api/products
```

Expected:

- health: HTTP 200 with database `ok`;
- database failure: HTTP 503;
- catalog tree: JSON;
- products: production PostgreSQL data with 179 products.

The generic `/api/catalog` route from the task is not implemented; the correct
route is `/api/catalog/tree`.

## 9. Actual backend environment checklist

The project does not use `JWT_SECRET` or `ADMIN_SESSION_SECRET`.

Actual Render variables:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=<Render-provided>
DATABASE_URL=<Render PostgreSQL internal URL>
CORS_ORIGIN=https://stroy-rayon-react.vercel.app,https://stroyrayon.kg,https://www.stroyrayon.kg
ADMIN_JWT_SECRET=<strong unique secret, 32+ characters>
ADMIN_JWT_EXPIRES_SECONDS=28800
ADMIN_INITIAL_EMAIL=<owner email>
ADMIN_INITIAL_PASSWORD=<bootstrap password, 12+ characters>
ADMIN_INITIAL_NAME=<owner name>
ADMIN_INITIAL_ROLE=OWNER
WHATSAPP_MANAGER_PHONE=<manager phone>
```

Enter secret values only in Render. Remove `ADMIN_INITIAL_PASSWORD` after the
first successful administrator login.

## 10. Vercel environment status

Status: **not configured**.

The authenticated Vercel CLI reported:

```text
No Environment Variables found for adyl-1991s-projects/stroy-rayon-react
```

Nothing was added because no real backend URL exists.

After Render verification, set in Vercel Production:

```text
VITE_USE_API=true
VITE_API_BASE_URL=https://<exact-render-service>.onrender.com/api
VITE_SITE_URL=https://stroyrayon.kg
VITE_API_TIMEOUT_MS=5000
VITE_ADMIN_TOKEN_STORAGE_KEY=stroyrayon_admin_token
```

The owner can enter the values in the Vercel dashboard. An authenticated CLI
can also add non-secret frontend values after the exact backend URL is known.

## 11. Vercel redeploy status

Status: **not run in Stage 27**.

A redeploy without the API variables would not connect the frontend, so no
meaningless production redeploy was triggered.

Required sequence:

1. obtain the real Render URL;
2. pass health/catalog/products smoke;
3. set Vercel Production variables;
4. redeploy `main`;
5. verify the new bundle/network target.

## 12. Live frontend localhost fallback status

Status: **localhost fallback remains**.

Verified on `https://stroy-rayon-react.vercel.app`:

- live bundle contains `localhost:4000`;
- no production API URL is compiled into the bundle;
- admin routes remain present.

This is expected until Vercel Production environment variables are set and a
new deployment completes.

## 13. Production smoke result

Status: **blocked / not run**.

After the backend and frontend connection are live, verify:

- `/api/health`;
- catalog tree and products;
- admin login/profile/logout;
- unauthorized admin rejection;
- admin product list/detail;
- price and stock updates;
- active/inactive product behavior;
- Checkout order creation;
- server-authoritative order total;
- order list/detail;
- order status and internal note updates;
- status history;
- stock reservation and release/write-off behavior.

Administrator credentials remain owner-only. The owner can enter them directly
in the browser during final E2E; they must not be sent to chat or committed.

## 14. Remaining blockers

1. Owner must finish Render Blueprint creation and approve the selected
   web/database resources.
2. Production migrations, 179-product seed, and bootstrap administrator must
   pass.
3. The exact backend URL must pass public/admin/order/stock smoke tests.
4. Vercel Production variables must be added and redeployed without localhost
   fallback.
5. DNS/HTTPS and final production Buyer/Admin/Security E2E remain incomplete.

Remaining blocker count: **5**.

## 15. Exact owner actions still needed

### In the currently opened Render page

1. Sign in with the GitHub-connected Render account.
2. Confirm repository `Adyl-1991/StroyRayon-React`.
3. Confirm branch `main` and root `render.yaml`.
4. Review the two resources and pricing.
5. Enter:
   - `ADMIN_INITIAL_EMAIL`;
   - `ADMIN_INITIAL_PASSWORD`;
   - `ADMIN_INITIAL_NAME`;
   - `WHATSAPP_MANAGER_PHONE`.
6. Create/apply the Blueprint.
7. Wait until PostgreSQL and web service finish deploying.
8. Copy the exact backend URL.
9. Verify migration and seed logs.
10. Open `/api/health`, `/api/catalog/tree`, and `/api/products`.
11. Log in once as administrator and remove the bootstrap password.

### Then in Vercel

1. Set the five Vite Production variables using the exact Render URL.
2. Redeploy Production.
3. Verify browser Network and live bundle no longer use localhost.
4. Run production public/admin/order/stock smoke.

## 16. Commands run

- initial Git status/log/diff checks;
- Render/Vercel token, CLI, and auth-path checks;
- `vercel whoami`;
- Vercel project listing/inspection;
- temporary Vercel project link in `%TEMP%`;
- Vercel Production environment variable listing;
- temporary link cleanup;
- Render Blueprint page opened in Chrome;
- backend URL and DNS checks before and after the owner-assisted page opening;
- live frontend bundle API target inspection;
- `npm run validate:catalog` — passed, zero warnings;
- `npm run generate:sitemap` — passed, 343 URLs;
- `npm run lint` — passed;
- `npm run build` — passed;
- `cd api && npm test` — passed, 29/29;
- `cd api && npx prisma validate` — passed;
- Render Blueprint YAML lint — passed.

No dashboard mutation, paid resource creation, secret entry, migration, seed, or
Vercel env change was claimed or performed.

## 17. Files changed

- `reports/stage27-owner-assisted-production-deploy.md`.

No application/config source change was necessary.

## 18. Secrets and artifacts safety check

- real secrets committed: no;
- secret values printed in report: no;
- `.env` committed: no;
- Render/Vercel token committed: no;
- database password/URL committed: no;
- old screenshots/photo artifacts included: no;
- storefront/admin UX changed: no.
