# Stage 22 — Production infrastructure deploy and final E2E

Audit date: 2026-06-19
Stage 21 baseline: `a3d94f1770f77b7a6837906db453b1cb6ec87a77`

## Executive result

Recommendation: **NO-GO**.

The application remains locally launch-ready, but production infrastructure
cannot be created from this workstation because there is no authenticated
Render, Vercel, registrar, or DNS-provider session. No production credentials
were available or invented.

Stage 22 prepared a reproducible Render Blueprint and an exact owner runbook.
The final production E2E remains blocked until the owner creates the paid
resources, repairs the Vercel deployment, and configures DNS.

## 1. Production URLs

| Component | Target | Verified status |
| --- | --- | --- |
| Frontend | `https://stroy-rayon-react.vercel.app` | Responds, but serves an old deployment |
| Canonical frontend | `https://stroyrayon.kg` | NXDOMAIN |
| Frontend redirect | `https://www.stroyrayon.kg` | NXDOMAIN |
| Backend temporary URL | Render-generated `onrender.com` URL | Not created |
| Backend final URL | `https://api.stroyrayon.kg` | NXDOMAIN |

GitHub reports the Stage 21 Vercel deployment
`dpl_CYZs8HFV5w43TNcnkcAbZ5K54vpx` as failed. The last successful production
deployment is commit `eecd44f93d0c63f63880983e5fd645ff724f76ea` from
2026-06-09. Therefore the current Vercel alias is not the Stage 21 storefront.

## 2. Production infrastructure decision

- Frontend: existing Vercel project.
- Backend: Render Node web service, Frankfurt.
- Database: Render PostgreSQL, Frankfurt.
- API custom domain: `api.stroyrayon.kg`.

The committed `render.yaml` selects:

- Render `starter` web service;
- Render `basic-256mb` PostgreSQL;
- private database networking;
- migrations before release;
- one-time initial seed;
- `/api/health` health checking;
- an automatically generated admin JWT secret.

The owner must review current Render pricing before Blueprint creation.

## 3. Working tree at start

`main` pointed to Stage 21 and matched `origin/main`.

The working tree already contained old modified/untracked visual audits,
screenshots, photo-related reports, and roadmap artifacts. None were staged or
included in Stage 22. Stage 22 used an explicit file whitelist.

## 4. Environment variables

### Frontend Vercel production

Required:

- `VITE_USE_API`
- `VITE_API_BASE_URL`
- `VITE_SITE_URL`
- `VITE_API_TIMEOUT_MS`
- `VITE_ADMIN_TOKEN_STORAGE_KEY`

Status: **not verified in Vercel**. The currently served JavaScript bundle does
not contain a production API domain and predates the admin/API integration.

### Backend Render production

Required:

- `DATABASE_URL`
- `NODE_ENV`
- `HOST`
- `PORT` (provided by Render)
- `CORS_ORIGIN`
- `ADMIN_JWT_SECRET`
- `ADMIN_JWT_EXPIRES_SECONDS`
- `ADMIN_INITIAL_EMAIL`
- `ADMIN_INITIAL_PASSWORD`
- `ADMIN_INITIAL_NAME`
- `ADMIN_INITIAL_ROLE`
- `WHATSAPP_MANAGER_PHONE`

Status: declared safely in `render.yaml`; secrets are generated or requested in
the Render dashboard. No real secret value is committed.

## 5. Database, migrations, and seed

Production database: **not created**.

Production migration status: **not run**.

Production seed/import status: **not run**.

Production product count: **unknown**; expected result is 179.

Local evidence:

- Prisma schema validates;
- seven local migrations are up to date;
- Stage 21 clean-database rehearsal applied all seven migrations;
- Stage 21 clean-database seed imported 179 products with zero skips and zero
  warnings.

The Render Blueprint connects `DATABASE_URL` from the managed database, runs
`npx prisma migrate deploy`, then runs the initial catalog/admin seed.

## 6. Admin bootstrap

Production bootstrap: **not run**.

The Blueprint requests the initial administrator email, password, and name
without storing them in Git. After the first successful login,
`ADMIN_INITIAL_PASSWORD` must be removed from the Render environment.

## 7. Backend production smoke

Status: **not run; backend URL does not exist**.

Pending checks:

- `/api/health`;
- product list/detail and count 179;
- order creation and server-authoritative totals;
- admin login/profile/orders/products;
- protected price/stock changes;
- unauthorized request rejection;
- exact production CORS behavior.

## 8. Frontend deployment

Status: **failed/stale**.

- The Vercel project is connected to `main`.
- GitHub records a failed production deployment for Stage 21.
- The public alias responds with HTTP 200 for `/`, `/catalog`,
  `/admin/login`, `robots.txt`, and `sitemap.xml`, but those responses come from
  the older successful deployment.
- The current alias cannot be accepted as production evidence for Stage 19–21.
- Repository tracked content is approximately 89.6 MB; approximately 75 MB is
  under `reports/`. This is a diagnostic risk factor, not a confirmed failure
  cause because protected Vercel build logs were unavailable.
- `.vercelignore` was added for an authenticated CLI fallback so old audit
  artifacts are excluded from a direct frontend upload.

Owner action: inspect the failed deployment log, verify Vite root/build/output
settings, set production env variables, and redeploy.

## 9. DNS and HTTPS

Verified on 2026-06-19:

- `stroyrayon.kg`: NXDOMAIN;
- `www.stroyrayon.kg`: NXDOMAIN;
- `api.stroyrayon.kg`: NXDOMAIN;
- HTTPS: unavailable for all three names.

Required records:

- apex frontend: exact A/ALIAS target shown by Vercel after adding the domain;
- `www`: exact project-specific CNAME shown by Vercel;
- `api`: CNAME to the exact Render `stroyrayon-api.onrender.com` target.

Records must be added at the domain's authoritative registrar/DNS provider.
Vercel and Render must verify the domains and issue TLS certificates before
launch. Generic target values were intentionally not guessed.

## 10. Buyer production E2E

Result: **not passed**.

The final buyer E2E cannot run because the active frontend is stale and there is
no production API/database. The complete buyer scenario passed locally in Stage
21 with API mode enabled.

## 11. Admin production E2E

Result: **not passed**.

No production admin account or API exists. The complete admin scenario passed
locally in Stage 21.

## 12. Security smoke

Production result: **not run**.

Local tests confirm:

- admin order/product APIs reject missing authorization;
- client-supplied prices are not trusted;
- server prices are persisted in order snapshots;
- production startup rejects wildcard/non-HTTPS CORS;
- JWT secret length is enforced.

Production CORS, JWT, unauthorized responses, and price-authority behavior must
be repeated against the deployed API.

## 13. Analytics and search

- Google Search Console: missing/not verified.
- Analytics: missing.
- Sitemap: generated with 343 URLs and the intended canonical domain.
- Conversion events: missing for add-to-cart, checkout submit, WhatsApp click,
  and phone click.
- Admin routes must remain excluded from public conversion tracking.

Search Console verification and sitemap submission are BEFORE LAUNCH tasks.
Analytics events can be completed immediately after a technically successful
launch if the owner accepts temporary measurement gaps.

## 14. Local command results

Frontend:

- `npm.cmd run validate:catalog`: passed, zero warnings;
- `npm.cmd run generate:sitemap`: passed, 343 URLs;
- `npm.cmd run lint`: passed;
- `npm.cmd run build`: passed;
- `git diff --check`: passed for Stage 22 files; warnings refer only to old
  pre-existing dirty report files.

Backend:

- `npm.cmd run lint`: passed;
- `npm.cmd run build`: passed;
- `npm.cmd run test`: passed, 27/27;
- `npx.cmd prisma validate`: passed;
- `npx.cmd prisma migrate status`: passed locally, seven migrations up to date.

The frontend build retains the known non-blocking large JavaScript chunk
warning.

## 15. BLOCKERS

1. Render PostgreSQL and backend resources have not been created; owner
   authentication and approval of paid resources are required.
2. Vercel production deployments after 2026-06-09 are failing; protected build
   logs and project settings require owner access.
3. Production frontend env is not verified and no production API URL exists.
4. All frontend/API custom domains are NXDOMAIN and HTTPS is unavailable.
5. Final production buyer/admin/security E2E cannot run until blockers 1–4 are
   resolved.

Remaining blocker count: **5**.

## 16. BEFORE LAUNCH

1. Owner deploys `render.yaml` and reviews the selected Render plans.
2. Verify seven production migrations, 179 products, zero duplicate/missing
   products, stock schema, and admin bootstrap.
3. Remove the initial admin password from Render after first login.
4. Inspect and repair the Vercel deployment failure.
5. Set all Vercel production env variables and redeploy `main`.
6. Add/verify frontend and API domains, DNS, redirects, and TLS.
7. Run the complete production buyer/admin/security E2E.
8. Verify Search Console ownership and submit the sitemap.

## 17. AFTER LAUNCH

- add analytics and public conversion events;
- add uptime/error monitoring and alerting;
- establish database backup/restore rehearsal;
- monitor orders, reservations, failed logins, and API latency.

## 18. Final owner checklist

The exact dashboard and verification procedure is documented in
`docs/stage22-production-deploy.md`.

The first required owner action is to sign in to Render, create the Blueprint
from `render.yaml`, enter the bootstrap admin fields, approve the paid
resources, and return the generated `onrender.com` API URL. Next, the owner must
open the failed Vercel deployment log and provide access or its non-secret error
text.
