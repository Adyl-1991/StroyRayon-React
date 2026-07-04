# Stage 40H - Provider-Specific Production Setup Runbook

Date: 2026-07-04

## 1. Scope

Stage 40H is a provider-specific owner runbook for the recommended production stack.

No production deploy was performed. No DNS, hosting, production PostgreSQL, production object storage, storefront, catalog, or admin feature changes were made.

Current production blockers remain:

- backend hosting/server is not created;
- production PostgreSQL is not created;
- object storage bucket/credentials are not configured;
- DNS target for `api.stroyrayon.kg` is unknown;
- production admin credentials are not created/provided;
- live smoke tests were not performed.

## 2. Recommended Stack

Recommended first production stack:

- Frontend: Vercel.
- Backend: Render-style paid web service.
- Database: Supabase Postgres.
- Object storage: Supabase Storage S3-compatible API, or Cloudflare R2.
- API domain: `api.stroyrayon.kg`.

Why this stack:

- Vercel already hosts the frontend.
- Render-style Node web service fits the existing NestJS backend.
- Supabase Postgres gives managed PostgreSQL without VPS maintenance.
- Stage 40F added S3-compatible storage support, so Supabase Storage or R2 can be used for production uploads.
- This avoids maintaining a VPS for Node, SSL, Nginx, DB backups, and storage on the first launch.

## 3. Current Repo Config Reviewed

Checked:

- `git status`
- `render.yaml`
- `.env.example`
- `api/.env.example`
- `scripts/production-env-check.mjs`
- `scripts/production-live-smoke.mjs`
- `scripts/production-upload-smoke.mjs`
- `reports/stage40f-object-storage-admin-gallery-v2.md`
- `reports/stage40g-production-infrastructure-execution-gate.md`

Git status before this report:

- branch: `main`;
- tracking `origin/main`;
- tracked files clean;
- existing untracked context files remain:
  - `docs/STROYRAYON_PROJECT_REPORT.md`
  - `reports/stage39-server-hosting-runbook.md`

These old untracked files were not touched and should not be mixed into this Stage 40H commit unless intentionally accepted later.

## 4. Render Backend Setup

Owner actions in Render:

1. Open Render dashboard.
2. Create a new Web Service or use Blueprint deployment from the repository.
3. Connect GitHub repository:

```text
https://github.com/Adyl-1991/StroyRayon-React.git
```

4. Branch:

```text
main
```

5. Runtime/language:

```text
Node
```

6. Region:

```text
Frankfurt or the closest stable region to target customers
```

7. Use a paid always-on plan. Do not use a sleeping/free plan for a real store.

Repo commands already present in `render.yaml`:

```bash
buildCommand: cd api && npm ci && npm run prisma:generate && npm run build
preDeployCommand: cd api && npx prisma migrate deploy
startCommand: cd api && npm run start:prod
initialDeployHook: cd api && npm run prisma:seed
healthCheckPath: /api/health
```

Expected manual command equivalents:

```bash
cd api
npm ci
npm run prisma:generate
npm run build
npx prisma migrate deploy
npm run start:prod
```

Backend health endpoint:

```text
/api/health
```

Important Render env:

```env
NODE_ENV=production
HOST=0.0.0.0
DATABASE_URL=<Supabase Postgres connection string>
CORS_ORIGIN=https://stroy-rayon-react.vercel.app,https://stroyrayon.kg,https://www.stroyrayon.kg
ADMIN_JWT_SECRET=<random 32+ character secret>
ADMIN_JWT_EXPIRES_SECONDS=28800
PUBLIC_API_ORIGIN=https://api.stroyrayon.kg
STORAGE_DRIVER=s3
WHATSAPP_MANAGER_PHONE=996...
```

Seed/bootstrap env for first admin only:

```env
ADMIN_INITIAL_EMAIL=<owner email>
ADMIN_INITIAL_PASSWORD=<strong temporary password>
ADMIN_INITIAL_NAME=StroyRayon Owner
ADMIN_INITIAL_ROLE=OWNER
```

After first production admin is created:

- remove `ADMIN_INITIAL_PASSWORD` from hosting env or rotate it;
- keep `ADMIN_JWT_SECRET` private;
- confirm `/api/admin/auth/login` works.

Custom domain in Render:

1. Open the Render service.
2. Go to Settings -> Custom Domains.
3. Add:

```text
api.stroyrayon.kg
```

4. Copy the DNS target Render gives.
5. Do not claim DNS is working until verification and TLS are complete.

## 5. Supabase Postgres Setup

Owner actions in Supabase:

1. Create a Supabase project.
2. Choose a region close to backend hosting if possible.
3. Open Database connection settings.
4. Copy a production connection string.

Connection guidance:

- For Render or another persistent backend, prefer Supabase direct connection if the platform/network supports it.
- If the backend environment cannot reach the direct endpoint because of IPv6/network constraints, use Supabase session pooler.
- Avoid transaction pooler for Prisma unless the Prisma connection settings are deliberately adjusted for transaction pooling.

Set in Render:

```env
DATABASE_URL=postgresql://...
```

Safe migration command:

```bash
cd api
npm.cmd exec prisma migrate deploy
```

Prisma generation/build:

```bash
cd api
npm.cmd run prisma:generate
npm.cmd run build
```

Seed/import catalog and bootstrap admin if required:

```bash
cd api
npm.cmd run prisma:seed
```

Production DB verification:

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

## 6. Object Storage Setup

The backend expects S3-compatible env:

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
```

Do not claim storage works until `npm.cmd run production:smoke:upload` passes with real credentials.

### Option A - Supabase Storage S3-Compatible

Owner actions:

1. Open Supabase project.
2. Create a storage bucket for product images, for example:

```text
stroyrayon-products
```

3. Configure the bucket/public access model for product images.
4. Open Supabase Storage S3 settings.
5. Generate S3 access keys for server-side use.
6. Copy endpoint, region, access key id, and secret access key.

Expected env shape:

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
S3_REGION=<project-region>
S3_BUCKET=stroyrayon-products
S3_ACCESS_KEY_ID=<Supabase S3 access key id>
S3_SECRET_ACCESS_KEY=<Supabase S3 secret access key>
S3_PUBLIC_BASE_URL=https://<project-ref>.supabase.co/storage/v1/object/public/stroyrayon-products
```

Notes:

- Supabase S3 access keys are server-side secrets.
- Do not expose access keys in frontend/Vercel.
- Confirm the public image URL pattern in the Supabase dashboard before finalizing `S3_PUBLIC_BASE_URL`.

### Option B - Cloudflare R2

Owner actions:

1. Create or open Cloudflare account with R2 enabled.
2. Create R2 bucket, for example:

```text
stroyrayon-products
```

3. Create R2 API token with read/write object permissions scoped to this bucket where possible.
4. Copy Access Key ID and Secret Access Key.
5. Configure public bucket access:
   - preferred for production: custom domain connected to the bucket;
   - development-only fallback: `r2.dev` public URL.

Expected env shape:

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=stroyrayon-products
S3_ACCESS_KEY_ID=<R2 access key id>
S3_SECRET_ACCESS_KEY=<R2 secret access key>
S3_PUBLIC_BASE_URL=https://<public-storage-domain>
```

Notes:

- Use a real custom domain for production images when possible.
- Do not use `r2.dev` as the long-term production URL.
- Run upload smoke before relying on admin image uploads.

## 7. DNS Setup

For API:

```text
api.stroyrayon.kg
```

If Render gives a CNAME target:

```text
Type: CNAME
Name: api
Value: <Render target>
```

If a VPS or provider gives an IP:

```text
Type: A
Name: api
Value: <server IP>
```

Owner DNS checklist:

1. Remove conflicting `A`, `AAAA`, or old `CNAME` records for `api`.
2. Add the record required by the backend provider.
3. Return to Render and verify custom domain.
4. Wait for TLS certificate issuance.
5. Verify DNS:

```bash
nslookup api.stroyrayon.kg
```

6. Verify API:

```bash
curl https://api.stroyrayon.kg/api/health
```

Expected after backend and DB are working:

```json
{
  "status": "ok",
  "database": "ok"
}
```

Do not switch frontend permanently to production API until health returns `database=ok`.

## 8. Vercel Frontend Env Setup

Required Vercel production env:

```env
VITE_USE_API=true
VITE_API_BASE_URL=https://api.stroyrayon.kg/api
VITE_SITE_URL=https://stroyrayon.kg
```

Optional:

```env
VITE_API_TIMEOUT_MS=5000
VITE_ADMIN_TOKEN_STORAGE_KEY=stroyrayon_admin_token
```

Owner actions:

1. Open Vercel project settings.
2. Add/update env variables for Production.
3. Redeploy frontend from `main`.
4. Open:

```text
https://stroy-rayon-react.vercel.app/
https://stroy-rayon-react.vercel.app/admin/login
```

5. If custom frontend domain is ready, also verify:

```text
https://stroyrayon.kg/
https://www.stroyrayon.kg/
```

## 9. Live Smoke Commands

After backend, DB, storage, admin, DNS, and Vercel env exist, run:

```bash
npm.cmd run production:check-env
npm.cmd run production:smoke
npm.cmd run production:smoke:upload
npm.cmd run qa:customer:live
```

Required local env before smoke:

```env
PRODUCTION_API_BASE_URL=https://api.stroyrayon.kg/api
VITE_USE_API=true
VITE_API_BASE_URL=https://api.stroyrayon.kg/api
DATABASE_URL=<same production DB URL or available in shell>
ADMIN_JWT_SECRET=<same production secret or validation-only value>
CORS_ORIGIN=https://stroy-rayon-react.vercel.app,https://stroyrayon.kg,https://www.stroyrayon.kg
PUBLIC_API_ORIGIN=https://api.stroyrayon.kg
STORAGE_DRIVER=s3
S3_ENDPOINT=<real endpoint>
S3_REGION=<real region>
S3_BUCKET=<real bucket>
S3_ACCESS_KEY_ID=<real access key>
S3_SECRET_ACCESS_KEY=<real secret key>
S3_PUBLIC_BASE_URL=<real public base URL>
PRODUCTION_ADMIN_EMAIL=<production admin email>
PRODUCTION_ADMIN_PASSWORD=<production admin password>
PRODUCTION_SMOKE_PRODUCT_ID=<safe hidden/test product id>
```

Optional:

```env
PRODUCTION_SMOKE_PRODUCT_SLUG=<known active product slug>
```

If using PowerShell locally, set env values in the current shell before running smoke commands, or use the hosting/provider dashboard for service env and only set smoke-only values locally.

## 10. What Was Tested In Stage 40H

Tested locally:

- `git status --short --branch`;
- reviewed `render.yaml`;
- reviewed `.env.example`;
- reviewed `api/.env.example`;
- reviewed Stage 40G production scripts;
- reviewed Stage 40F and Stage 40G reports.

Browsed official docs for current provider behavior:

- Render Node web services and custom domains;
- Render Blueprint spec;
- Supabase Postgres connection methods;
- Supabase Storage S3 authentication;
- Cloudflare R2 API tokens and public bucket options;
- Vercel environment variables.

No local build/test suite was rerun because this stage only adds a documentation runbook and does not change runtime code.

## 11. What Could Not Be Tested

Not tested:

- Render production deploy;
- Supabase production DB connection;
- Supabase Storage or Cloudflare R2 real upload;
- DNS for `api.stroyrayon.kg`;
- TLS issuance;
- production admin login;
- live smoke commands;
- Vercel frontend against live API.

Reason:

- owner credentials/access are not available in this workspace;
- backend hosting, DB, storage and DNS have not been created yet.

## 12. Owner Actions Required

Owner must manually:

1. Create Render backend service or Blueprint deployment.
2. Create Supabase Postgres project.
3. Choose Supabase Storage or Cloudflare R2 for product images.
4. Create bucket and access keys.
5. Set all backend env variables in Render.
6. Run migrations with `prisma migrate deploy`.
7. Run seed/import if needed.
8. Create production admin.
9. Configure `api.stroyrayon.kg` DNS.
10. Wait for TLS.
11. Set Vercel production env.
12. Redeploy frontend.
13. Run production smoke commands.

## 13. Remaining Blockers

- Backend hosting/server not created.
- Production PostgreSQL not created.
- Storage provider not chosen/created.
- S3 credentials not available.
- DNS target for `api.stroyrayon.kg` unknown.
- Production admin credentials not created/provided.
- Live smoke tests not run.

## 14. Recommended Stage 40I

Recommended Stage 40I:

- If owner has created accounts and provided dashboard access/credentials: execute real production deployment and run live smoke tests.
- If owner has not created accounts yet: sit with owner through Render + Supabase setup and fill env values step by step.
- Do not start new admin/catalog features until production infrastructure is live or explicitly deferred.

## 15. References

- Render Node deployment docs: https://render.com/docs/deploy-node-express-app
- Render Blueprint spec: https://render.com/docs/blueprint-spec
- Render custom domains docs: https://render.com/docs/custom-domains
- Supabase Postgres connection docs: https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase Storage S3 auth docs: https://supabase.com/docs/guides/storage/s3/authentication
- Cloudflare R2 token docs: https://developers.cloudflare.com/r2/api/tokens/
- Cloudflare R2 public bucket docs: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Vercel environment variables docs: https://vercel.com/docs/environment-variables

## 16. Commit

Commit hash: reported in final Codex response after commit finalization.

Note: a final git commit hash cannot be embedded inside a file that belongs to the same commit without changing that commit hash.

## 17. Conclusion

Stage 40H gives the owner a provider-specific, concrete production setup runbook for Vercel + Render + Supabase Postgres + Supabase Storage or Cloudflare R2.

Real production deployment was not performed because required owner infrastructure and credentials are still missing.
