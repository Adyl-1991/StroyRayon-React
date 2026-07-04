# Stage 40G - Production Infrastructure Execution Gate

Дата: 2026-07-04

## 1. Scope

Stage 40G выполнен как production infrastructure gate.

Production deploy, DNS changes, hosting creation, production PostgreSQL creation and real production object storage bucket creation were not performed.

This stage does not claim production success. Live API cannot be considered working until the owner creates backend hosting, production DB, storage credentials and DNS.

## 2. Current Readiness Status

Current codebase is locally ready for a production infrastructure setup:

- NestJS backend has production build/start commands.
- Prisma migrations exist and `migrate deploy` is the intended production migration command.
- `/api/health` checks database connectivity through Prisma.
- CORS production validation exists in `api/src/main.ts`.
- Stage 40F storage abstraction supports local and S3-compatible storage.
- Admin product gallery endpoints and upload validation are implemented.
- Frontend can point to `VITE_API_BASE_URL=https://api.stroyrayon.kg/api`.

Real production blockers remain:

- backend hosting/server is not created;
- production PostgreSQL is not created;
- DNS target for `api.stroyrayon.kg` is unknown;
- real object storage bucket and credentials are not configured;
- production admin credentials are not created/provided;
- live smoke tests cannot pass until the above exists.

## 3. Files Changed

Changed:

- `.env.example`
- `api/.env.example`
- `package.json`
- `render.yaml`

Added:

- `scripts/production-env-check.mjs`
- `scripts/production-live-smoke.mjs`
- `scripts/production-upload-smoke.mjs`
- `reports/stage40g-production-infrastructure-execution-gate.md`

No storefront redesign, catalog rewrite, Admin Products feature work, DNS update or deploy was done.

## 4. Env Variables Required

Backend required for production:

- `DATABASE_URL`
- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT` if the hosting platform requires explicit port config
- `CORS_ORIGIN`
- `ADMIN_JWT_SECRET`
- `PUBLIC_API_ORIGIN=https://api.stroyrayon.kg`
- `STORAGE_DRIVER`

Backend storage env for S3-compatible production storage:

- `STORAGE_DRIVER=s3`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`

Backend optional/recommended:

- `ADMIN_JWT_EXPIRES_SECONDS=28800`
- `WHATSAPP_MANAGER_PHONE`
- `SITE_WHATSAPP_MANAGER_PHONE`

Seed/bootstrap only:

- `ADMIN_INITIAL_EMAIL`
- `ADMIN_INITIAL_PASSWORD`
- `ADMIN_INITIAL_NAME`
- `ADMIN_INITIAL_ROLE=OWNER`

Important: remove or rotate `ADMIN_INITIAL_PASSWORD` after the first production admin is created.

Frontend/Vercel required:

- `VITE_USE_API=true`
- `VITE_API_BASE_URL=https://api.stroyrayon.kg/api`

Frontend optional:

- `VITE_SITE_URL=https://stroyrayon.kg`
- `VITE_API_TIMEOUT_MS=5000`
- `VITE_ADMIN_TOKEN_STORAGE_KEY=stroyrayon_admin_token`

## 5. Scripts Added

Added package scripts:

- `npm.cmd run production:check-env`
- `npm.cmd run production:smoke`
- `npm.cmd run production:smoke:upload`

### `production:check-env`

Validates required backend/frontend production env.

Behavior:

- fails if required vars are missing;
- checks `ADMIN_JWT_SECRET` length;
- checks explicit HTTPS `CORS_ORIGIN`;
- checks `PUBLIC_API_ORIGIN`;
- checks `VITE_USE_API=true`;
- checks `VITE_API_BASE_URL` includes `/api`;
- validates S3 env when `STORAGE_DRIVER=s3`;
- warns that `STORAGE_DRIVER=local` requires persistent disk/volume in production.

Local verification:

- empty local env: failed intentionally with missing env list;
- test production-like env: passed.

### `production:smoke`

Live API smoke script.

Checks:

- API base URL is not localhost unless `--allow-local` is used;
- `/api/health` returns `status=ok` and `database=ok`;
- `/api/catalog/tree` responds and is non-empty;
- `/api/products?limit=5` responds and returns items;
- product detail responds;
- active variants are exposed when the product has variants;
- first absolute product image URL is reachable;
- protected admin endpoint rejects unauthenticated request;
- optional admin login/profile/products checks if `PRODUCTION_ADMIN_EMAIL` and `PRODUCTION_ADMIN_PASSWORD` are set.

Required live env:

- `PRODUCTION_API_BASE_URL` or `VITE_API_BASE_URL`

Optional:

- `PRODUCTION_ADMIN_EMAIL`
- `PRODUCTION_ADMIN_PASSWORD`
- `PRODUCTION_SMOKE_PRODUCT_SLUG`

### `production:smoke:upload`

Live upload/storage smoke script.

Checks:

- admin login;
- test product detail;
- upload a safe tiny PNG through `POST /api/admin/products/:id/images`;
- uploaded image is attached to gallery;
- public image URL is reachable when absolute;
- image alt can be updated;
- image can be detached safely;
- delete response includes `storageDelete`.

Required live env:

- `PRODUCTION_API_BASE_URL` or `VITE_API_BASE_URL`
- `PRODUCTION_ADMIN_EMAIL`
- `PRODUCTION_ADMIN_PASSWORD`
- `PRODUCTION_SMOKE_PRODUCT_ID`

Important: use a safe hidden/test product id. The script is intentionally blocked without an explicit product id.

## 6. DB Migration Checklist

Production DB must be created manually before deploy.

Safe production sequence:

```bash
cd api
npm.cmd ci
npm.cmd run prisma:generate
npm.cmd exec prisma migrate deploy
npm.cmd run build
```

Seed/import after migrations:

```bash
cd api
npm.cmd run prisma:seed
```

Safe production DB verification:

```sql
select count(*) from "CatalogNode";
select count(*) from "Product";
select count(*) from "ProductVariant";
select count(*) from "ProductImage";
select count(*) from "ProductDocument";
select count(*) from "AdminUser";
select count(*) from "Order";
```

Forbidden on production:

```bash
prisma migrate reset
prisma db push --force-reset
```

## 7. DNS Checklist

Cannot be completed yet because backend hosting does not exist and the DNS target is unknown.

After backend hosting is created:

1. Add custom domain `api.stroyrayon.kg` in the hosting dashboard.
2. Copy the exact DNS target from the hosting dashboard.
3. In the DNS provider for `stroyrayon.kg`, create:
   - `CNAME api -> <provider-target>` for managed app hosting; or
   - `A api -> <server-ip>` for VPS.
4. Remove conflicting old `A`, `AAAA`, or `CNAME` records for `api`.
5. Wait for DNS and TLS issuance.
6. Verify:

```bash
nslookup api.stroyrayon.kg
curl https://api.stroyrayon.kg/api/health
```

Expected live health after DB is connected:

```json
{
  "status": "ok",
  "database": "ok"
}
```

Frontend DNS/Vercel:

- `stroyrayon.kg` should point to Vercel production when the owner is ready.
- Vercel env must use `VITE_API_BASE_URL=https://api.stroyrayon.kg/api`.
- Backend `CORS_ORIGIN` must include the exact frontend HTTPS origins.

## 8. Storage Checklist

Provider-agnostic checklist:

1. Choose S3-compatible provider.
2. Create production bucket.
3. Configure public read/base URL or CDN URL.
4. Create access key with minimum required object permissions.
5. Set backend env:
   - `STORAGE_DRIVER=s3`
   - `S3_ENDPOINT`
   - `S3_REGION`
   - `S3_BUCKET`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_PUBLIC_BASE_URL`
6. Run `npm.cmd run production:check-env`.
7. Run `npm.cmd run production:smoke:upload` against a safe hidden/test product.
8. Open the returned image URL in browser.
9. Redeploy/restart backend and verify the image still works.

Possible providers:

- Supabase Storage S3-compatible API;
- Cloudflare R2;
- DigitalOcean Spaces;
- AWS S3;
- another owner-selected S3-compatible provider.

Current recommendation from previous discussion:

- Vercel frontend;
- Render-style paid backend web service;
- Supabase Postgres;
- Supabase Storage or another S3-compatible bucket.

Exact provider/account creation remains an owner action.

## 9. Live Smoke Status

Live production smoke was not performed.

Reason:

- backend hosting/server does not exist;
- production DB does not exist;
- DNS target for `api.stroyrayon.kg` is unknown;
- storage bucket/credentials do not exist;
- production admin credentials are not available.

Scripts are ready, but they must be run only after owner-created infrastructure exists.

Commands to run after infrastructure exists:

```bash
npm.cmd run production:check-env
npm.cmd run production:smoke
npm.cmd run production:smoke:upload
npm.cmd run qa:customer:live
```

## 10. Local Tests Run

Backend:

- `npm.cmd --prefix api run prisma:generate` - passed.
- `npm.cmd --prefix api run build` - passed.
- `npm.cmd --prefix api test` - passed, 49/49 tests.
- `npm.cmd --prefix api run lint` - passed.

Frontend:

- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run qa:customer` - passed, 1762 checks, 0 failed.
- `npm.cmd run qa:admin-product-flow` - passed, 54 checks, 0 failed.

New script checks:

- `node --check scripts/production-env-check.mjs` - passed.
- `node --check scripts/production-live-smoke.mjs` - passed.
- `node --check scripts/production-upload-smoke.mjs` - passed.
- `npm.cmd run production:check-env` with empty env - failed intentionally with clear missing env list.
- `npm.cmd run production:check-env` with test production-like env - passed.

Frontend build note:

- Vite still reports the existing non-blocking large chunk warning.

## 11. What Could Not Be Tested

Not tested live:

- `https://api.stroyrayon.kg/api/health`;
- live catalog/products API;
- live admin login;
- live production upload to S3-compatible storage;
- live DNS and TLS;
- Vercel frontend against live backend;
- production DB migrations against a real production DB.

Reason: owner infrastructure and credentials are not available yet.

## 12. Remaining Blockers

- Owner must create backend hosting/server.
- Owner must create production PostgreSQL.
- Owner must choose/create object storage bucket.
- Owner must provide/set production env variables.
- Owner must configure DNS for `api.stroyrayon.kg`.
- Owner must create/seed production admin.
- Owner must run live smoke scripts and Vercel live QA after deploy.

## 13. Recommended Stage 40H

Recommended next stage depends on owner readiness:

1. If owner creates hosting/DB/storage: execute real production deploy and live smoke tests.
2. If owner is not ready yet: prepare provider-specific step-by-step setup for the chosen stack, likely Render backend + Supabase Postgres/Storage.

Do not start new admin/catalog features until production infrastructure is either created or explicitly deferred.

## 14. Commit

Commit hash: reported in the final Codex response after commit finalization.

Note: a final git commit hash cannot be embedded inside a file that belongs to the same commit without changing that commit hash.

## 15. Conclusion

Stage 40G meets the execution-gate criterion locally: production env validation, live API smoke, and upload/storage smoke scripts are now available, and the runbook clearly separates local readiness from real production deployment.

Production deploy was not performed because required owner infrastructure and credentials are still missing.
