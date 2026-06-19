# Stage 21 — Production deploy/env/DNS readiness + full E2E QA

Date: 2026-06-19

## 1. Baseline

- Stage 20 commit: `e9ba9b953a7fb2209e9c19b1367347f7fdd62197`.
- Local `main` and `origin/main` matched before Stage 21.
- No old report, screenshot or photo artifact was staged.

## 2. Production environment checklist

Frontend names:

```text
VITE_USE_API=true
VITE_API_BASE_URL=https://api.stroyrayon.kg/api
VITE_SITE_URL=https://stroyrayon.kg
VITE_API_TIMEOUT_MS=5000
VITE_ADMIN_TOKEN_STORAGE_KEY=stroyrayon_admin_token
```

Backend names:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=<hosting-provided port>
DATABASE_URL=<managed PostgreSQL URL>
CORS_ORIGIN=https://stroyrayon.kg,https://www.stroyrayon.kg
WHATSAPP_MANAGER_PHONE=<production number>
ADMIN_JWT_SECRET=<unique random 32+ character secret>
ADMIN_JWT_EXPIRES_SECONDS=28800
```

First bootstrap only:

```text
ADMIN_INITIAL_EMAIL
ADMIN_INITIAL_PASSWORD
ADMIN_INITIAL_NAME
ADMIN_INITIAL_ROLE=OWNER
```

Real values were not printed or committed.

Stage 21 changes:

- canonical/site origin is configurable through `VITE_SITE_URL`/`SITE_URL`;
- backend accepts explicit `HOST` and `NODE_ENV`;
- production rejects wildcard or invalid non-HTTPS CORS origins;
- localhost HTTP remains permitted only to support local production-mode smoke;
- `.env.example` files now document all required launch variables.

## 3. Frontend readiness

Passed:

- catalog validation: zero warnings;
- sitemap generation: 343 URLs;
- `robots.txt` exists, allows intended crawling and references the production sitemap;
- lint;
- production build with `VITE_USE_API=true`;
- Home, Catalog, category, Search, Product, Cart and Checkout browser routes;
- admin routes remain outside the public `App`/Header/Footer layout;
- Vercel SPA rewrite;
- admin `X-Robots-Tag: noindex, nofollow`;
- baseline `nosniff`, referrer and permissions security headers.

Launch blocker fixed:

- Checkout API payload contained internal cart/variant fields while the backend uses
  `forbidNonWhitelisted`. Real API-mode checkout returned HTTP 400 and silently used WhatsApp
  fallback. Stage 21 now sends only the accepted order DTO fields. Browser E2E confirms a real
  database order number is returned.

Existing non-blocking build warning:

- the main frontend bundle remains larger than 500 kB.

## 4. Backend readiness

Application code readiness: **ready**.

Passed:

- lint;
- Nest production build;
- 27/27 tests;
- production startup with exact local CORS origin;
- production startup rejects `CORS_ORIGIN=*`;
- health, products, orders, admin auth, admin orders and admin products endpoints;
- authoritative price and reservation behavior;
- safe admin product price/stock/visibility updates.

Infrastructure readiness: **missing**.

- No production backend service/domain is configured in the repository or discoverable locally.
- No managed production PostgreSQL URL was available for verification.
- No CI/deploy workflow or backend host manifest is present.

## 5. Database, migrations and seed

A temporary clean PostgreSQL database was created for this audit and removed afterward.

Passed:

- all 7 Prisma migrations applied from zero with `prisma migrate deploy`;
- seed imported 155 catalog nodes, 40 brands, 179 products, 179 product images,
  528 relations and 179 stock records;
- zero skipped products and zero warnings;
- first admin bootstrap reported ready using environment-provided credentials.

Production procedure:

1. provision managed PostgreSQL;
2. set `DATABASE_URL`;
3. run `npx prisma migrate deploy`;
4. run the seed once with initial admin variables;
5. verify owner login;
6. remove `ADMIN_INITIAL_PASSWORD` from hosting configuration.

## 6. Buyer E2E

Result: **passed locally in production API mode**.

Automated Chrome DevTools flow:

1. Home rendered with public Header;
2. Catalog rendered;
3. category rendered;
4. Search rendered;
5. Product page loaded from API;
6. product added to cart;
7. quantity increased;
8. Checkout form submitted;
9. backend order created (`SR-2026-000007` in the final run);
10. server returned authoritative total;
11. stock reservation was created;
12. confirmation/disclaimer rendered;
13. test order was cancelled and its reservation released.

## 7. Admin E2E

Result: **passed locally**.

- unauthenticated `/admin/products` redirected to login;
- wrong login showed an error;
- correct login redirected to `/admin/orders`;
- created order appeared in list/detail;
- status changed to confirmed;
- internal note saved;
- status history contained multiple entries;
- products list/detail opened;
- price updated;
- stock updated;
- public API reflected the change;
- inactive product disappeared from public product API;
- product was reactivated;
- original product price/stock/status were restored;
- logout returned to login.

## 8. Security smoke

Passed:

- admin orders list without token: HTTP 401;
- admin products list without token: HTTP 401;
- status update without token: HTTP 401;
- product price update without token: HTTP 401;
- malicious client price `1` was ignored;
- order used the authoritative database price;
- production wildcard CORS configuration fails fast.

## 9. DNS/domain status

Result: **not ready**.

On June 19, 2026:

- `stroyrayon.kg`: DNS `NXDOMAIN`;
- `www.stroyrayon.kg`: DNS `NXDOMAIN`;
- HTTPS cannot be established;
- www/non-www redirect cannot be tested;
- the project is not linked to a local `.vercel` project;
- Vercel domain settings are not accessible from this workspace.

Required owner/hosting actions:

1. Deploy/link the frontend Vercel project and add both `stroyrayon.kg` and
   `www.stroyrayon.kg`.
2. Copy the exact DNS records shown by that Vercel project into the authoritative DNS provider.
   Vercel commonly requests an apex `A` record and a `www` `CNAME`, but project settings are
   authoritative and must be used instead of guessed values.
3. Choose one primary domain and configure the other as a redirect. The current sitemap/canonical
   default is `https://stroyrayon.kg`; keep it primary unless `VITE_SITE_URL` and sitemap are
   deliberately switched to `www`.
4. Provision backend hosting, add `api.stroyrayon.kg`, and create the exact CNAME/A record supplied
   by that backend host.
5. Wait for DNS propagation, verify TLS, redirects, `/api/health`, CORS and production E2E.

References:

- Vercel custom domain configuration:
  `https://vercel.com/docs/domains/working-with-domains/add-a-domain`
- Vercel domain redirects:
  `https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting`

## 10. Analytics and search readiness

Missing:

- Google Search Console verification;
- Google Analytics or alternative analytics snippet/config;
- conversion events for add-to-cart, checkout submit, WhatsApp click and phone click.

Admin routes have no public conversion tracking and now receive an explicit noindex header.

Search Console and sitemap submission are **BEFORE LAUNCH** once DNS/HTTPS works.
Analytics is strongly recommended before launch but does not block order creation.

## 11. BLOCKERS

Count: **3**.

1. **Production backend + managed PostgreSQL are not provisioned.**
   There is no live API endpoint or production database to receive orders.
2. **Production frontend deployment/env connection is not verified.**
   Vercel project access/link and production values for `VITE_USE_API`,
   `VITE_API_BASE_URL`, and `VITE_SITE_URL` are missing.
3. **Domain/DNS/HTTPS are not configured.**
   Apex and `www` currently return NXDOMAIN; no redirect or TLS can be verified.

## 12. BEFORE LAUNCH

- provision backend and managed PostgreSQL;
- configure production secrets and exact CORS origins;
- apply migrations and bootstrap owner;
- deploy frontend with API mode enabled;
- connect apex, `www`, and API DNS;
- verify HTTPS and primary-domain redirect;
- rerun `scripts/stage21-e2e.mjs` against production URLs;
- add Search Console verification and submit `/sitemap.xml`;
- choose analytics provider and add public conversion events;
- configure uptime/log/error monitoring and database backups;
- remove initial admin password from host environment after bootstrap.

## 13. AFTER LAUNCH

- split the large frontend bundle;
- add CI to run frontend/backend checks on every push;
- add product field-level audit history;
- add refresh-token/revocation and login throttling;
- add richer analytics funnels and operational dashboards;
- continue the separate product image plan.

## 14. Go-live checklist

- [ ] Managed PostgreSQL provisioned and backed up.
- [ ] Backend deployed and `/api/health` green.
- [ ] Seven migrations applied.
- [ ] Seed shows 179 products and zero warnings.
- [ ] Owner login verified; bootstrap password removed.
- [ ] Frontend production env uses live API and selected canonical domain.
- [ ] Frontend deployed from `main`.
- [ ] Apex and `www` DNS resolve.
- [ ] `api.stroyrayon.kg` resolves.
- [ ] TLS valid on frontend and API.
- [ ] www/non-www redirect verified.
- [ ] CORS permits only required production frontend origins.
- [ ] Buyer and admin E2E pass against production.
- [ ] `robots.txt` and 343-URL sitemap load over HTTPS.
- [ ] Search Console ownership verified and sitemap submitted.
- [ ] Monitoring, logs and database backups verified.
- [ ] Rollback deployment identified.

## 15. Commands and results

Passed:

- `git status`;
- `git log --oneline -5`;
- `npm.cmd run validate:catalog`;
- `npm.cmd run generate:sitemap`;
- frontend lint;
- frontend API-mode production build;
- backend lint;
- backend build;
- backend tests: 27/27;
- `npx prisma validate`;
- `npx prisma migrate status`;
- clean-database `npx prisma migrate deploy`;
- clean-database seed/bootstrap;
- production CORS failure smoke;
- Chrome buyer/admin/security E2E;
- `git diff --check`.

Reusable local E2E runner:

```text
scripts/stage21-e2e.mjs
```
