# Stage 40I - Owner Production Setup Checklist

Дата: 2026-07-05

## 1. Максат

Бул checklist StroyRayon React долбоорун real production infrastructure'га чыгаруу үчүн owner кол менен аткара турган кадамдарды тактайт.

Recommended stack:

- Frontend: Vercel
- Backend: Render
- Database: Supabase Postgres
- Storage: Supabase Storage же Cloudflare R2
- API domain: `api.stroyrayon.kg`

Бул этапта production deploy жасалган жок. DNS, hosting, production DB жана storage bucket азырынча түзүлгөн жок.

## 2. Маанилүү коопсуздук

Secrets, passwords, access keys жана database connection string'дерди чатка жазбоо керек.

Аларды түз эле тиешелүү dashboard'дорго киргизүү керек:

- Render env settings;
- Supabase project settings;
- Cloudflare R2 settings;
- Vercel env settings.

## 3. Render Backend

Owner actions:

1. Render аккаунт ачуу.
2. New Web Service түзүү.
3. GitHub repo туташтыруу:

```text
Adyl-1991/StroyRayon-React
```

4. Branch тандоо:

```text
main
```

5. Paid always-on plan тандоо.
6. Backend env variables киргизүү.
7. Custom domain кошуу:

```text
api.stroyrayon.kg
```

Render repo config already expects:

```bash
cd api && npm ci && npm run prisma:generate && npm run build
cd api && npx prisma migrate deploy
cd api && npm run start:prod
```

Health endpoint:

```text
/api/health
```

Render DNS target бергенден кийин аны домен DNS'ке киргизүү керек.

## 4. Render Backend Env

Required backend env:

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

First admin bootstrap only:

```env
ADMIN_INITIAL_EMAIL=<owner email>
ADMIN_INITIAL_PASSWORD=<strong temporary password>
ADMIN_INITIAL_NAME=StroyRayon Owner
ADMIN_INITIAL_ROLE=OWNER
```

Admin түзүлгөндөн кийин:

- `ADMIN_INITIAL_PASSWORD` env'ден алып салуу же rotate кылуу;
- `ADMIN_JWT_SECRET` эч кимге көрсөтпөө;
- `/api/admin/auth/login` иштеп жатканын текшерүү.

## 5. Supabase Postgres

Owner actions:

1. Supabase project ачуу.
2. PostgreSQL connection string алуу.
3. Render ичиндеги `DATABASE_URL` env'ге коюу.
4. Production migration жүргүзүү:

```bash
cd api
npm.cmd exec prisma migrate deploy
```

Seed/import керек болсо:

```bash
cd api
npm.cmd run prisma:seed
```

Production'да буларды колдонбоо керек:

```bash
prisma migrate reset
prisma db push --force-reset
```

DB count verification:

```sql
select count(*) from "CatalogNode";
select count(*) from "Product";
select count(*) from "ProductVariant";
select count(*) from "ProductImage";
select count(*) from "ProductDocument";
select count(*) from "AdminUser";
select count(*) from "Order";
```

## 6. Storage Option A - Supabase Storage

Керек:

1. Supabase Storage ичинде bucket түзүү, мисалы:

```text
stroyrayon-products
```

2. Product images public read/base URL даярдоо.
3. S3-compatible access keys алуу.
4. Render env'ге storage variables коюу.

Required storage env:

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=<Supabase S3 endpoint>
S3_REGION=<Supabase project region>
S3_BUCKET=stroyrayon-products
S3_ACCESS_KEY_ID=<Supabase S3 access key id>
S3_SECRET_ACCESS_KEY=<Supabase S3 secret access key>
S3_PUBLIC_BASE_URL=<Supabase public bucket URL>
```

Important:

- S3 keys server-side гана болушу керек.
- Vercel/frontend env'ге S3 secrets жазылбайт.
- Storage иштейт деп `production:smoke:upload` өтмөйүнчө айтууга болбойт.

## 7. Storage Option B - Cloudflare R2

Керек:

1. Cloudflare R2 bucket түзүү:

```text
stroyrayon-products
```

2. API token/access keys алуу.
3. Public storage domain даярдоо.
4. Render env'ге storage variables коюу.

Required storage env:

```env
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=stroyrayon-products
S3_ACCESS_KEY_ID=<R2 access key id>
S3_SECRET_ACCESS_KEY=<R2 secret access key>
S3_PUBLIC_BASE_URL=<public storage domain>
```

Recommendation:

- Production үчүн custom public storage domain колдонуу жакшы.
- `r2.dev` long-term production URL катары колдонбоо жакшы.

## 8. DNS

`api.stroyrayon.kg` үчүн:

Эгер Render CNAME target берсе:

```text
Type: CNAME
Name: api
Value: <Render target>
```

Эгер VPS/IP болсо:

```text
Type: A
Name: api
Value: <server IP>
```

Checklist:

1. `api` үчүн old/conflicting `A`, `AAAA`, `CNAME` records жок экенин текшерүү.
2. Render берген target'ти DNS'ке киргизүү.
3. Render dashboard'до custom domain verified болгонун күтүү.
4. TLS/SSL issued болгонун күтүү.
5. DNS текшерүү:

```bash
nslookup api.stroyrayon.kg
```

6. API health текшерүү:

```bash
curl https://api.stroyrayon.kg/api/health
```

Күтүлгөн жооп:

```json
{
  "status": "ok",
  "database": "ok"
}
```

## 9. Vercel Frontend Env

Vercel Production env:

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

Андан кийин frontend redeploy кылуу керек.

Open after redeploy:

```text
https://stroy-rayon-react.vercel.app/
https://stroy-rayon-react.vercel.app/admin/login
```

Custom frontend domain даяр болсо:

```text
https://stroyrayon.kg/
https://www.stroyrayon.kg/
```

## 10. Live Smoke Tests

Бардыгы даяр болгондон кийин:

```bash
npm.cmd run production:check-env
npm.cmd run production:smoke
npm.cmd run production:smoke:upload
npm.cmd run qa:customer:live
```

Smoke үчүн керектүү local env:

```env
PRODUCTION_API_BASE_URL=https://api.stroyrayon.kg/api
VITE_USE_API=true
VITE_API_BASE_URL=https://api.stroyrayon.kg/api
DATABASE_URL=<production DB URL>
ADMIN_JWT_SECRET=<production JWT secret or validation-only value>
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

Secrets'ти чатка жазбайбыз. Smoke command жүргүзүлө турган machine'де гана temporary env катары коюлат.

## 11. Done Criteria

Production setup complete деп эсептелет, эгер:

- Render backend deployed жана running;
- `https://api.stroyrayon.kg/api/health` returns `status=ok`, `database=ok`;
- Supabase Postgres migrations applied;
- catalog seeded/imported;
- production admin login works;
- storage upload smoke passes;
- Vercel frontend uses production API;
- `qa:customer:live` passes;
- admin can open products/orders on live frontend.

## 12. What Was Done In Stage 40I

Done:

- Owner-facing production checklist created.
- Stack decision repeated clearly.
- Render, Supabase Postgres, storage, DNS, Vercel and smoke steps summarized.
- Security warning about secrets added.

Not done:

- production deploy;
- DNS changes;
- hosting account creation;
- production DB creation;
- storage bucket creation;
- live smoke tests.

## 13. Remaining Owner Actions

Owner still needs to:

1. Create Render backend service.
2. Create Supabase Postgres project.
3. Choose Supabase Storage or Cloudflare R2.
4. Create storage bucket and access keys.
5. Fill Render env.
6. Configure DNS `api.stroyrayon.kg`.
7. Fill Vercel env.
8. Redeploy frontend.
9. Run live smoke tests.

## 14. Recommended Stage 40J

Recommended Stage 40J:

- Real production setup session with owner dashboards open.
- Fill Render/Supabase/storage/Vercel env step by step.
- Run live smoke tests.
- Document final production URLs and any remaining blockers.

Do not start new admin/catalog features until production infrastructure is live or explicitly deferred.

## 15. Commit

Commit hash: reported in final Codex response after commit finalization.

Note: a final git commit hash cannot be embedded inside a file that belongs to the same commit without changing that commit hash.
