# Stage 26 — Production Backend and Vercel Connection

Audit date: 2026-06-19
Baseline commit: `ae2118ce248b54e77255bf0a5e8d160b00cbc6b6`

## 1. Summary

The repository is ready for the owner to create the Render Blueprint, managed
PostgreSQL database, and backend service. The production infrastructure itself
was not created during Stage 26 because this workstation has no Render or
Vercel owner authentication:

- no Render API key/token;
- no Vercel token or local CLI session;
- no Render/Vercel CLI installed;
- no authenticated dashboard connector.

No production credential or URL was invented.

Public verification confirms:

- the latest Vercel frontend deployment is successful;
- the frontend still uses the `localhost:4000` API fallback;
- `api.stroyrayon.kg` does not resolve;
- no confirmed Render backend public URL exists;
- production migrations, seed, and smoke tests remain pending.

No application code or configuration change was required in Stage 26.

## 2. Render deployment status

Status: **not deployed / owner action required**.

The repository contains a valid `render.yaml` Blueprint for:

- a Node web service named `stroyrayon-api`;
- a managed PostgreSQL database;
- Frankfurt placement for both resources;
- private `DATABASE_URL` injection;
- automatic builds from `main`;
- migrations before every release;
- a one-time initial seed;
- health checks at `/api/health`;
- the future custom domain `api.stroyrayon.kg`.

The guessed URL `https://stroyrayon-api.onrender.com/api/health` returns HTTP
404. It is not evidence that the StroyRayon service exists and must not be used
as the backend URL. The owner must copy the exact service URL shown by Render
after Blueprint creation.

## 3. PostgreSQL status

Status: **not created / not externally verifiable**.

The Blueprint is configured to create:

- database: `stroyrayon`;
- user: `stroyrayon`;
- region: Frankfurt;
- plan: `basic-256mb`;
- no public IP allow list;
- internal connection string passed to the web service as `DATABASE_URL`.

No production database password or connection string is stored in the
repository.

## 4. Migration status

Production status: **not run**.

Configured production command:

```text
cd api && npx prisma migrate deploy
```

Render runs this as `preDeployCommand` after the build and before the service
start command. The command uses the Render-injected `DATABASE_URL`.

Local evidence:

- Prisma schema validation passed;
- seven migrations were found;
- local development database is up to date.

Local success does not prove production migration success. The owner must
verify the Render deploy log shows all seven migrations applied or no pending
migrations.

## 5. Seed/import 179 products status

Production status: **not run**.

Configured initial command:

```text
cd api && npm run prisma:seed
```

The Blueprint executes it with `initialDeployHook` after the first successful
service deployment.

Expected result:

- 179 products;
- zero skipped products;
- zero warnings;
- catalog nodes, brands, product images, relations, and stock rows created;
- initial administrator created.

The seed uses upsert/update behavior for catalog, brands, products, stock, and
administrator identity. It rebuilds images/relations and removes products not
present in the authoritative source, so it does not create duplicate products
when rerun. It must still be treated as a production data synchronization
operation and its logs must be reviewed.

## 6. Backend public URL

Status: **not available**.

Pending owner result:

```text
https://<exact-render-service-name>.onrender.com
```

Do not use the example or guessed hostname. Copy the exact URL from the Render
service overview after deployment.

After the temporary Render URL passes smoke tests, configure:

```text
https://api.stroyrayon.kg
```

The custom domain currently returns NXDOMAIN.

## 7. Backend health and API verification

Production status: **not run** because no backend URL exists.

Actual repository routes include the global `/api` prefix:

```text
GET  /api/health
GET  /api/catalog/tree
GET  /api/catalog/node
GET  /api/products
GET  /api/products/:slug
POST /api/orders
POST /api/admin/auth/login
GET  /api/admin/auth/me
POST /api/admin/auth/logout
GET  /api/admin/orders
GET  /api/admin/products
```

The requested generic `/api/catalog` path is not an implemented endpoint.
Use `/api/catalog/tree`.

Expected health behavior:

- database connected: HTTP 200, `{"status":"ok","database":"ok"}`;
- database unavailable: HTTP 503,
  `{"status":"error","database":"error"}`.

Owner verification commands:

```bash
curl -i https://<exact-render-url>/api/health
curl -i https://<exact-render-url>/api/catalog/tree
curl -i https://<exact-render-url>/api/products
```

The products response must reflect the production PostgreSQL seed and contain
179 products before the frontend is connected.

## 8. Actual Render backend environment

The project does not use `JWT_SECRET` or `ADMIN_SESSION_SECRET`.

Actual required/used variables:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=<provided by Render>
DATABASE_URL=<injected from Render PostgreSQL>
CORS_ORIGIN=https://stroy-rayon-react.vercel.app,https://stroyrayon.kg,https://www.stroyrayon.kg
ADMIN_JWT_SECRET=<unique strong 32+ character secret>
ADMIN_JWT_EXPIRES_SECONDS=28800
ADMIN_INITIAL_EMAIL=<owner email>
ADMIN_INITIAL_PASSWORD=<bootstrap password, 12+ characters>
ADMIN_INITIAL_NAME=<owner name>
ADMIN_INITIAL_ROLE=OWNER
WHATSAPP_MANAGER_PHONE=<manager number>
```

Safety rules:

- never commit any real value;
- remove `ADMIN_INITIAL_PASSWORD` after first successful administrator login;
- do not use wildcard CORS;
- keep the Vercel alias in CORS until the custom frontend domain is live.

## 9. Vercel environment status

Status: **not configured for the production backend**.

The current production deployment for commit
`ae2118ce248b54e77255bf0a5e8d160b00cbc6b6` succeeded:

- deployment ID: `5125203547`;
- state: `success`;
- production alias: `https://stroy-rayon-react.vercel.app`.

Live bundle verification:

- admin routes are present;
- no production API URL is compiled into the bundle;
- `localhost:4000` fallback remains.

After Render health/catalog/products smoke passes, set in Vercel Production:

```text
VITE_USE_API=true
VITE_API_BASE_URL=https://<exact-render-url>/api
VITE_SITE_URL=https://stroyrayon.kg
VITE_API_TIMEOUT_MS=5000
VITE_ADMIN_TOKEN_STORAGE_KEY=stroyrayon_admin_token
```

Then trigger a new production deployment. Vite variables are build-time values;
editing them without redeployment does not update the live frontend.

## 10. Frontend API connection status

Status: **not connected**.

After the Vercel redeploy, verify:

1. the JavaScript bundle no longer contains `localhost:4000`;
2. browser network requests target the exact Render backend;
3. Home/Catalog/category/product pages load from production API;
4. Cart and Checkout create a real production order;
5. `/admin/login` authenticates against Render;
6. `/admin/orders` and `/admin/products` load protected production data.

After `api.stroyrayon.kg` resolves and HTTPS is issued, replace the temporary
Render URL with:

```text
VITE_API_BASE_URL=https://api.stroyrayon.kg/api
```

and redeploy again.

## 11. Production smoke checklist

Current production result: **blocked; backend does not exist yet**.

Run after the Render URL is available:

### Public API

- `/api/health` returns 200 and database `ok`;
- `/api/catalog/tree` loads;
- `/api/products` contains 179 products;
- known product detail loads;
- inactive products remain hidden.

### Authentication and admin

- wrong admin login returns a safe error;
- correct admin login works;
- profile and logout work;
- orders and products reject unauthenticated requests;
- admin products list/detail load;
- price edit works and public API reflects it;
- stock edit preserves existing reservations;
- active/inactive toggle works.

### Buyer and CRM

- Checkout creates an order;
- total uses the database price, not client input;
- stock reservation increments atomically;
- order appears in admin CRM;
- status update works;
- internal note update works;
- history records the change;
- cancellation releases reservations;
- delivery writes off stock according to existing logic.

Restore all test product values and cancel E2E orders after verification.

## 12. Remaining blockers

1. Owner must create the Render Blueprint and PostgreSQL resources.
2. Production env, migrations, 179-product seed, and admin bootstrap must
   complete successfully.
3. The real Render backend URL must pass public/admin/order/stock smoke tests.
4. Vercel Production API variables must be set and redeployed without localhost
   fallback.
5. DNS/HTTPS and final production Buyer/Admin/Security E2E remain incomplete.

Remaining blocker count: **5**.

The separately documented backend dependency security upgrade is not a current
build/deploy blocker and remains a later tested stage.

## 13. Owner actions still required

### Render

1. Sign in to Render with GitHub repository access.
2. Choose **New > Blueprint**.
3. Select `Adyl-1991/StroyRayon-React`, branch `main`.
4. Confirm root Blueprint file `render.yaml`.
5. Review and approve the selected paid API/PostgreSQL plans.
6. Enter all `sync: false` admin/WhatsApp values.
7. Create the Blueprint.
8. Verify build, migration, start, and initial seed logs.
9. Verify 179 products, zero skips, and zero warnings.
10. Open `/api/health`, `/api/catalog/tree`, and `/api/products`.
11. Verify bootstrap administrator login.
12. Remove `ADMIN_INITIAL_PASSWORD`.
13. Copy the exact `onrender.com` backend URL.

### Vercel

1. Open the existing Vercel project.
2. Add the Production Vite variables using the exact Render URL.
3. Redeploy `main`.
4. Verify the live bundle/network no longer uses localhost.
5. Run the production storefront/admin smoke.

### DNS

1. Add `api.stroyrayon.kg` to the Render service.
2. Add the exact Render-provided CNAME in the authoritative DNS panel.
3. Configure the Vercel apex and `www` records shown by Vercel.
4. Wait for DNS and TLS verification.
5. Switch Vercel API base to the final API domain and redeploy.

## 14. Commands run

Initial checks:

- `git status --short`;
- `git log -1 --oneline`;
- `git diff --stat`;
- `git diff --check`;
- local/remote commit hash verification.

Access and production inspection:

- Render/Vercel token, CLI, and auth-path presence checks;
- public HTTP checks for frontend, API domain, and guessed Render hostname;
- DNS checks for apex, `www`, and API domain;
- Vercel production deployment status through GitHub deployments API;
- live Vercel JavaScript bundle API URL inspection;
- source review of Render Blueprint and actual backend env usage.

Local validation:

- `npm run validate:catalog` — passed, zero warnings;
- `npm run generate:sitemap` — passed, 343 URLs;
- `npm run lint` — passed;
- `npm run build` — passed;
- `cd api && npm test` — passed, 29/29;
- `cd api && npx prisma validate` — passed;
- `cd api && npx prisma migrate status` — local DB up to date, seven
  migrations;
- Render YAML lint — passed.

Production migrations and seed were not run because no production database or
owner access exists.

## 15. Files changed

Stage 26:

- `reports/stage26-production-backend-vercel-connection.md`.

No application/config change was necessary. No `.env`, real credential, DB
URL with password, JWT/admin secret, screenshot, photo artifact, or unrelated
report is included.

## 16. Secrets and artifacts safety check

- real secrets committed: no;
- `.env` committed: no;
- Render/Vercel credentials committed: no;
- production database URL committed: no;
- old screenshots/photo artifacts included: no;
- storefront/admin UX changed: no.
