# Stage 25 — Render Backend Production URL Readiness

Audit date: 2026-06-19
Baseline commit: `9888054de4af4df8d2ad32350b4deaa4c3e682ef`

## 1. Summary

The repository is ready for an owner-authenticated Render Blueprint deployment
of the NestJS API and managed PostgreSQL.

No Render service or production PostgreSQL database is currently verifiable
from this workstation:

- `api.stroyrayon.kg` is unresolved;
- no confirmed `onrender.com` service URL is available;
- production migrations, seed, and admin bootstrap have not run.

One backend production-readiness issue was fixed in Stage 25. The health
endpoint previously returned HTTP 200 even when the database query failed.
Render treats 2xx/3xx as healthy, so a broken PostgreSQL connection could have
passed the deployment health check. `/api/health` now returns:

- HTTP 200 with `{"status":"ok","database":"ok"}` when PostgreSQL works;
- HTTP 503 with `{"status":"error","database":"error"}` when PostgreSQL is
  unavailable.

No storefront, admin layout, catalog data, product image, secret, or public UX
was changed.

## 2. Current status

| Component | Status |
| --- | --- |
| Vercel frontend build | Passed |
| Vercel production alias | `https://stroy-rayon-react.vercel.app` |
| Live frontend API config | Not ready; bundle still contains localhost fallback |
| Render Blueprint | Repository-ready; owner deployment required |
| Render backend URL | Not created/confirmed |
| Production PostgreSQL | Not created/confirmed |
| Production migrations | Not run |
| Production seed/import | Not run |
| Production admin bootstrap | Not run |
| API custom domain | `api.stroyrayon.kg` is unresolved |
| Production Buyer/Admin E2E | Not run |

## 3. Render backend readiness

`render.yaml` defines:

- Node web service `stroyrayon-api`;
- GitHub repository and `main` branch;
- Frankfurt region;
- paid `starter` web plan;
- automatic deploys on commit;
- managed PostgreSQL in the same region;
- private `DATABASE_URL` injection through `fromDatabase`;
- migration command before each deploy;
- one-time catalog/admin seed;
- `/api/health` readiness check;
- custom domain `api.stroyrayon.kg`.

Build command:

```text
cd api && npm ci && npm run prisma:generate && npm run build
```

Start command:

```text
cd api && npm run start:prod
```

`npm run start:prod` executes `node dist/main.js`, which is the correct NestJS
production artifact.

Port binding is correct:

- Render supplies `PORT`;
- the API reads `process.env.PORT`;
- `HOST` is `0.0.0.0`;
- the app calls `app.listen(port, host)`.

Health path is `/api/health`, not `/health`, because NestJS applies the global
`api` prefix before the `health` controller route.

The Render Blueprint syntax passed YAML validation. The used fields are present
in Render's official Blueprint schema. Render documentation confirms:

- `preDeployCommand` runs after build and before start;
- database migrations are a recommended pre-deploy task;
- `initialDeployHook` runs after the service's first successful deployment and
  is suitable for one-time database seeding;
- web services should bind to `0.0.0.0` and Render's `PORT`;
- HTTP health checks require 2xx/3xx for healthy and 4xx/5xx for unhealthy.

Official references:

- https://render.com/docs/blueprint-spec
- https://render.com/docs/deploys
- https://render.com/docs/health-checks
- https://render.com/docs/web-services

## 4. PostgreSQL readiness

The Blueprint declares:

- database name: `stroyrayon`;
- database user: `stroyrayon`;
- region: Frankfurt;
- plan: `basic-256mb`;
- empty public IP allow list;
- internal connection string injected into the API service.

Prisma reads only `DATABASE_URL` from the environment. No production database
credential belongs in Git.

The schema contains the launch-critical models for:

- catalog nodes, brands, products, and images;
- stock and reserved quantities;
- customers and orders;
- server-side order item price snapshots;
- order status history;
- administrator users.

Order creation, price authority, stock reservation, release/write-off, and
admin updates all depend on the production database being reachable.

## 5. Environment variables needed

### Render backend

Set or confirm in the Render dashboard:

- `DATABASE_URL` — automatically linked from Render PostgreSQL;
- `NODE_ENV=production`;
- `HOST=0.0.0.0`;
- `PORT` — supplied by Render; do not hardcode it;
- `CORS_ORIGIN=https://stroy-rayon-react.vercel.app,https://stroyrayon.kg,https://www.stroyrayon.kg`;
- `ADMIN_JWT_SECRET` — unique generated value, at least 32 characters;
- `ADMIN_JWT_EXPIRES_SECONDS=28800`;
- `ADMIN_INITIAL_EMAIL`;
- `ADMIN_INITIAL_PASSWORD` — bootstrap only, minimum 12 characters;
- `ADMIN_INITIAL_NAME`;
- `ADMIN_INITIAL_ROLE=OWNER`;
- `WHATSAPP_MANAGER_PHONE`.

The API rejects a missing/short JWT secret and rejects wildcard or non-HTTPS
production CORS origins.

After the first successful administrator login, remove
`ADMIN_INITIAL_PASSWORD` from the Render environment.

### Vercel frontend

After obtaining the working Render public URL, set in the Vercel **Production**
environment:

- `VITE_USE_API=true`;
- `VITE_API_BASE_URL=https://<render-service>.onrender.com/api`;
- `VITE_SITE_URL=https://stroyrayon.kg`;
- `VITE_API_TIMEOUT_MS=5000`;
- `VITE_ADMIN_TOKEN_STORAGE_KEY=stroyrayon_admin_token`.

Use the confirmed Render URL, including `/api`. Do not enter a guessed service
hostname.

After `api.stroyrayon.kg` resolves and HTTPS works, change:

```text
VITE_API_BASE_URL=https://api.stroyrayon.kg/api
```

Then redeploy the frontend again.

## 6. Migration, seed, and import steps

### Automatic Blueprint path

For each deploy:

1. Render checks out `main`.
2. Build installs API dependencies.
3. Prisma Client is generated.
4. NestJS compiles to `api/dist`.
5. `npx prisma migrate deploy` runs as `preDeployCommand`.
6. Render starts `node dist/main.js`.
7. `/api/health` must return HTTP 200 with database `ok`.

For the first successful service deployment only:

8. `initialDeployHook` runs `cd api && npm run prisma:seed`.
9. The seed imports the repository catalog and bootstraps the administrator.

The seed is designed to be repeatable:

- catalog nodes, brands, products, and stock use upsert/update behavior;
- product images and relations are rebuilt for imported products;
- stale products not in the authoritative source are removed;
- an existing administrator password is not overwritten.

Expected seed result:

- 179 products;
- zero skipped products;
- zero warnings;
- stock record for every imported product;
- no duplicate product slug/SKU constraint failure;
- initial administrator ready.

Do not connect Vercel to the API until the initial deploy hook finishes and the
179-product result is verified in Render logs/API.

## 7. Vercel environment steps

1. Copy the exact working `https://...onrender.com` service URL from Render.
2. In Vercel project settings, open Environment Variables.
3. Set the five production variables listed above.
4. Ensure `VITE_API_BASE_URL` ends with `/api`.
5. Redeploy `main` to Production.
6. Open the deployed JavaScript bundle or browser network panel.
7. Confirm requests use the Render URL and not `localhost:4000`.
8. Verify Home, Catalog, Checkout, `/admin/login`, `/admin/orders`, and
   `/admin/products`.
9. After API DNS is live, replace the Render subdomain with
   `https://api.stroyrayon.kg/api` and redeploy.

Vite values are compiled at build time. Editing Vercel variables without a new
deployment does not update the live bundle.

## 8. Production smoke checklist

All API paths below include the global `/api` prefix.

### Health and public catalog

- `GET /api/health` returns HTTP 200 and database `ok`;
- `GET /api/catalog/tree` returns the catalog;
- `GET /api/products` returns 179 active products;
- `GET /api/products/:slug` returns a known product;
- inactive products are absent from the public API.

### Admin authentication

- wrong `POST /api/admin/auth/login` returns a readable safe error;
- correct login returns a token;
- `GET /api/admin/auth/me` works with bearer token;
- `POST /api/admin/auth/logout` succeeds;
- protected endpoints reject missing/invalid tokens.

### Admin products

- `GET /api/admin/products` loads;
- product detail loads;
- price update works and public API reflects it;
- stock update works without reducing quantity below reservations;
- active/inactive toggle works;
- test values are restored.

### Buyer order and CRM

- checkout creates an order with server-calculated totals;
- client-provided price is not trusted;
- stock reservation increments atomically;
- admin orders list/detail load;
- order status and internal note updates work;
- order history records the status change;
- cancellation releases reserved stock;
- delivered status writes off stock according to the existing CRM logic.

### CORS

- requests from `https://stroy-rayon-react.vercel.app` are allowed;
- final apex and `www` origins are allowed;
- an unrelated origin receives no CORS permission;
- wildcard CORS is not enabled.

## 9. Owner actions

### Render dashboard

1. Sign in to Render with GitHub repository access.
2. Choose **New > Blueprint**.
3. Select `Adyl-1991/StroyRayon-React` and root `render.yaml`.
4. Review and approve the web/database plans and current pricing.
5. Enter the requested administrator and WhatsApp values.
6. Create the Blueprint resources.
7. Wait for build and `prisma migrate deploy`.
8. Wait for the initial seed hook.
9. Verify 179 products and zero seed warnings.
10. Open `/api/health` on the generated service URL.
11. Verify administrator login.
12. Remove `ADMIN_INITIAL_PASSWORD`.
13. Copy the exact public `onrender.com` URL.

### Vercel dashboard

1. Set `VITE_USE_API=true`.
2. Set `VITE_API_BASE_URL=<exact Render URL>/api`.
3. Confirm the remaining production Vite variables.
4. Redeploy Production.
5. Confirm the live bundle/network no longer uses localhost.

### DNS after temporary URL smoke

1. Add `api.stroyrayon.kg` to the Render service.
2. Add the exact Render-provided CNAME at the authoritative DNS provider.
3. Wait for DNS and Render TLS verification.
4. Change Vercel API base URL to `https://api.stroyrayon.kg/api`.
5. Redeploy and run final production E2E.

## 10. Commands run

Repository inspection:

- `git status --short`;
- `git log -1 --oneline`;
- `git diff --stat`;
- `git diff --check`;
- review of `render.yaml`, API scripts, Prisma seed/schema, health, CORS, auth,
  order, and stock dependencies;
- external API/DNS checks.

Frontend:

- `npm run validate:catalog` — passed, zero warnings;
- `npm run generate:sitemap` — passed, 343 URLs;
- `npm run lint` — passed;
- `npm run build` — passed.

Backend:

- `npm test` — passed, 29/29;
- `npx prisma validate` — passed;
- `npm run lint` — passed;
- `npm run build` — passed;
- healthy database HTTP smoke — 200;
- unavailable database HTTP smoke — 503.

Deployment configuration:

- `render.yaml` YAML lint — passed.

## 11. Files changed

Stage 25 files:

- `api/src/modules/health/health.service.ts`;
- `api/src/modules/health/health.service.spec.ts`;
- `reports/stage25-render-backend-production-url.md`.

Previously local Stage 24 report included for documentation:

- `reports/stage24-vercel-fresh-build-verification.md`.

No real secret, `.env`, old screenshot, photo artifact, catalog data, product
image, storefront UX file, or unrelated roadmap file is included.

## 12. Remaining blockers

1. Owner must create the Render Blueprint and managed PostgreSQL resources.
2. Owner must enter production backend/admin environment values and verify
   migrations plus the 179-product seed.
3. A real backend public URL must be obtained and pass the complete API smoke.
4. Vercel production API variables must be set and the frontend redeployed
   without localhost fallback.
5. DNS/HTTPS and final production Buyer/Admin/Security E2E remain incomplete.

Remaining production blocker count: **5**.

The separately documented backend dependency upgrade remains a before-public-
launch security/risk item and was not expanded into a framework refactor here.
