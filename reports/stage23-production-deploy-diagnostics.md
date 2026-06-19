# Stage 23 — Production Deploy Diagnostics

Audit date: 2026-06-19
Baseline commit: `32971a816fdd8d610836584d90bac39e5c4510ec`

## Summary

The Vercel production failure was reproduced from the real deployment log and
traced to `.vercelignore`.

The unanchored entry `api` matched both the root backend directory and
`src/api`, so Vercel removed the frontend API client modules before running the
Vite build. Vite then failed with nine unresolved imports such as
`../api/adminApi`, `../api/productsApi`, and `../api/ordersApi`.

Minimal fix:

- changed ignored root directories to `/api`, `/docs`, `/reports`, and
  `/scripts`;
- changed the generated output entry to `/dist`;
- retained all frontend `src/api` modules.

No public storefront, admin layout, catalog, product data, images, backend
business logic, or secrets were changed.

The corrected filtered frontend tree passed a clean `npm ci` and Vite build
with all five `src/api` modules present.

## Vercel diagnostics

Latest failed deployment:

- commit: `32971a816fdd8d610836584d90bac39e5c4510ec`;
- deployment ID: `dpl_4YDXBbe1i3pTVj99oM4HiwPNRvHn`;
- GitHub deployment state: `failure`;
- build region: `iad1`;
- Vercel detected `.vercelignore` and removed 356 files;
- dependency install completed;
- `npm run build` failed after 99 modules with nine unresolved imports.

Confirmed root cause:

```text
.vercelignore: api
```

The pattern was not root-anchored. It removed `src/api`, including:

- `src/api/adminApi.js`;
- `src/api/catalogApi.js`;
- `src/api/client.js`;
- `src/api/ordersApi.js`;
- `src/api/productsApi.js`.

Corrected entries:

```text
/api
/docs
/reports
/scripts
/dist
```

Local verification:

- normal repository build: passed, 105 modules;
- clean filtered deployment-tree build in `%TEMP%`: passed, 105 modules;
- frontend API modules retained: 5/5;
- sitemap generation: 343 URLs, zero warnings;
- `robots.txt`: present and references
  `https://stroyrayon.kg/sitemap.xml`;
- known large JavaScript chunk warning remains non-fatal.

Owner must push/redeploy the fix and verify the new Vercel deployment status.
The current public alias must not be treated as final production until it serves
the Stage 23 commit with production API environment variables.

Required Vercel project settings:

- Root Directory: repository root;
- Framework: Vite;
- Install Command: `npm ci` or Vercel default lockfile install;
- Build Command: `npm run build`;
- Output Directory: `dist`;
- production branch: `main`.

## Render diagnostics

`render.yaml` readiness:

- YAML syntax validation: passed;
- official Render schema contains all used service fields:
  `initialDeployHook`, `preDeployCommand`, `autoDeployTrigger`, `domains`, and
  `fromDatabase`;
- web service region and PostgreSQL region both use Frankfurt;
- database connection is injected through `fromDatabase`;
- PostgreSQL public IP allow list is empty;
- health check is `/api/health`;
- custom API domain is `api.stroyrayon.kg`.

Exact Render build path was reproduced locally:

```text
cd api
npm ci
npm run prisma:generate
npm run build
npx prisma migrate deploy
```

Result:

- clean backend install: passed;
- Prisma Client generation: passed;
- NestJS build: passed;
- seven migrations detected;
- no pending local migrations;
- `npm run start:prod`: started successfully when required production env was
  supplied;
- `/api/health`: `status=ok`, `database=ok`.

The first start attempt intentionally failed because local `.env` has no
`ADMIN_JWT_SECRET`. This confirms the production guard works. A temporary
non-production 32+ character process variable was used for the successful
smoke and was removed immediately.

The Blueprint seed path is valid because Render checks out the complete
repository and `api/prisma/seed.ts` imports catalog data from root `src/data`.
`.vercelignore` affects Vercel uploads, not the Render repository checkout.

## Required owner actions

1. Push the Stage 23 `.vercelignore` fix to `main`.
2. In Vercel, set the production variables listed below and redeploy `main`.
3. Confirm the new Vercel build transforms 105 modules and no unresolved
   `src/api` import remains.
4. Sign in to Render and create the Blueprint from root `render.yaml`.
5. Review and approve the selected paid web/database plans.
6. Enter the bootstrap administrator fields and WhatsApp manager number in the
   Render dashboard.
7. Verify the first Render deployment applies seven migrations and runs the
   initial seed.
8. Confirm 179 products, zero skipped products, and zero seed warnings.
9. Log in with the bootstrap administrator, then remove
   `ADMIN_INITIAL_PASSWORD` from Render.
10. Add frontend and API domains in Vercel/Render.
11. Fix registrar nameserver/delegation and create the exact dashboard-provided
    DNS records.
12. Run final buyer, admin, and security E2E against production.

## Env checklist

### Vercel production

- `VITE_USE_API=true`
- `VITE_API_BASE_URL=https://api.stroyrayon.kg/api`
- `VITE_SITE_URL=https://stroyrayon.kg`
- `VITE_API_TIMEOUT_MS=5000`
- `VITE_ADMIN_TOKEN_STORAGE_KEY=stroyrayon_admin_token`

All names exist in `.env.example`. Actual Vercel values are not visible from
this workstation and must be verified in the owner dashboard. A new deployment
is required after changing Vercel env values.

### Render production

- `DATABASE_URL` — injected from Render PostgreSQL;
- `NODE_ENV=production`;
- `HOST=0.0.0.0`;
- `PORT` — supplied by Render;
- `CORS_ORIGIN=https://stroy-rayon-react.vercel.app,https://stroyrayon.kg,https://www.stroyrayon.kg`;
- `ADMIN_JWT_SECRET` — generated by Render, minimum 32 characters;
- `ADMIN_JWT_EXPIRES_SECONDS=28800`;
- `ADMIN_INITIAL_EMAIL`;
- `ADMIN_INITIAL_PASSWORD` — bootstrap only, minimum 12 characters;
- `ADMIN_INITIAL_NAME`;
- `ADMIN_INITIAL_ROLE=OWNER`;
- `WHATSAPP_MANAGER_PHONE`.

All names exist in `api/.env.example`. No real secret was added to Git.

## DNS checklist

Current verified state:

- `stroyrayon.kg`: NXDOMAIN/error;
- `www.stroyrayon.kg`: NXDOMAIN/error;
- `api.stroyrayon.kg`: NXDOMAIN/error.

Because even the apex and nameserver lookup does not resolve, the owner must
first confirm at the registrar that:

1. the domain registration is active;
2. authoritative nameservers are assigned correctly;
3. the DNS zone exists at the selected DNS provider.

After adding domains in the hosting dashboards, create only the exact records
shown there:

- apex `stroyrayon.kg`: Vercel-provided A/ALIAS record;
- `www`: Vercel-provided CNAME;
- `api`: CNAME to the exact Render service hostname.

Then verify:

- apex resolves and serves HTTPS;
- `www` redirects to the canonical apex;
- `api.stroyrayon.kg/api/health` serves HTTPS and reports database `ok`;
- Vercel and Render certificates are issued;
- sitemap and canonical URLs use `https://stroyrayon.kg`.

Do not guess generic provider targets when project-specific values are shown.

## Migration + seed/import checklist

Render release sequence:

1. install backend dependencies;
2. generate Prisma Client;
3. build NestJS;
4. run `npx prisma migrate deploy`;
5. run the initial `npm run prisma:seed`;
6. start `node dist/main.js`;
7. pass `/api/health`.

Expected first-deploy results:

- seven migrations applied;
- 179 products;
- zero duplicate product slugs;
- zero skipped/missing products;
- zero seed warnings;
- brands, catalog nodes, stock, order, reservation, and admin tables ready;
- bootstrap administrator created;
- later catalog seeds do not overwrite the existing administrator password.

After the first successful administrator login, remove the bootstrap password
from the Render environment.

## Production E2E checklist

### Buyer

1. Open production Home, Catalog, category, search, and product routes.
2. Add a product to cart and change quantity.
3. Submit Checkout.
4. Verify the order exists in production PostgreSQL/admin CRM.
5. Verify totals use the server product price, not client input.
6. Verify stock reservation.
7. Verify fallback/disclaimer content.
8. Cancel the E2E order and confirm reservation release.

### Admin

1. Open `/admin/login` without public Header/Footer.
2. Verify wrong login error.
3. Verify correct login redirect.
4. Load orders and order detail.
5. Update status and internal note.
6. Verify order history.
7. Load products.
8. Change price, stock, and active state.
9. Verify public API/storefront reflects changes.
10. Restore product values and log out.

### Security

1. `/admin/orders` and `/admin/products` reject missing auth.
2. Admin API mutations reject missing/invalid bearer tokens.
3. Order API ignores client price as a source of truth.
4. CORS accepts only configured production frontend origins.
5. Admin routes remain outside public conversion analytics.

Production runner:

```powershell
$env:STAGE21_SITE_URL='https://stroyrayon.kg'
$env:STAGE21_API_URL='https://api.stroyrayon.kg/api'
$env:STAGE21_ADMIN_EMAIL='<production admin email>'
$env:STAGE21_ADMIN_PASSWORD='<production admin password>'
npm.cmd run qa:stage21
```

Do not save or commit production credentials.

## Dependency security note

Additional runtime-only audits found:

- frontend: 2 low advisories in React Router;
- backend: 3 high and 7 moderate advisories in the NestJS/Express dependency
  chain.

The reported backend fixes require major NestJS upgrades. That work is larger
than the minimal Stage 23 deploy unblock and was not applied silently.

Before public launch, the owner/development team must review exposure and plan a
tested dependency upgrade. The application currently has no file-upload
feature, reducing exposure to the Multer advisories, but the audit findings
must not be ignored.

## Commands run

Requested commands:

- `git status --short`: completed; only pre-existing old artifacts plus Stage
  23 files were present;
- `git log -1 --oneline`: baseline confirmed;
- `npm ci`: passed;
- `npm run validate:catalog`: passed, zero warnings;
- `npm run generate:sitemap`: passed, 343 URLs;
- `npm run lint`: passed;
- `npm run build`: passed;
- `cd api && npm test`: passed, 27/27;
- `cd api && npx prisma validate`: passed.

Additional diagnostics:

- official Vercel deployment log inspection: completed, root cause found;
- filtered Vercel-style clean install/build: passed;
- backend clean install/generate/build/migrate flow: passed;
- backend production start/health smoke: passed;
- Render YAML lint: passed;
- Render official-schema field presence: passed;
- DNS lookup: all three production names unresolved;
- production dependency audits: completed with findings above.

An optional temporary full JSON-schema wrapper did not run because its
ephemeral Node packages were not resolvable. This did not affect the YAML lint,
official field checks, or reproduced Render commands.

## Files changed

- `.vercelignore` — minimal root-anchoring fix;
- `reports/stage23-production-deploy-diagnostics.md` — this report.

No `.env`, secret, storefront UX, product data, brand data, images, old visual
reports, screenshots, photo artifacts, or unrelated roadmap files were changed
for Stage 23.

## Remaining blockers

1. Stage 23 fix is not in production until committed, pushed, and successfully
   redeployed by Vercel.
2. Render web service and PostgreSQL have not been created by the owner.
3. Production env and bootstrap administrator values have not been entered.
4. Domain registration/delegation/DNS/HTTPS are unresolved.
5. Final production buyer/admin/security E2E has not run.
6. Backend runtime dependency audit has 3 high and 7 moderate advisories that
   require a separately tested framework dependency upgrade or documented risk
   acceptance before public launch.

Remaining blocker count: **6**.
