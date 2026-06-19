# Stage 24 — Vercel Fresh Build Verification

Verification date: 2026-06-19

## 1. Summary

Stage 23 commit was pushed to `main`, Vercel automatically started a fresh
production deployment, and the deployment completed successfully.

The `.vercelignore` production build blocker is closed.

The working tree was not clean before push because it already contained old
visual reports, screenshots, photo artifacts, and unrelated untracked reports.
They were not staged, committed, or pushed. The pushed commit contained only
the Stage 23 `.vercelignore` fix and diagnostics report.

## 2. Pushed commit

- Branch: `main -> origin/main`
- Commit: `9888054de4af4df8d2ad32350b4deaa4c3e682ef`
- Message: `Stage 23: Unblock Vercel production deploy`
- Included files:
  - `.vercelignore`
  - `reports/stage23-production-deploy-diagnostics.md`

No `.env`, secret, old screenshot, visual report, photo artifact, catalog data,
or unrelated file was included.

## 3. Vercel build result

Result: **PASSED**

- GitHub deployment ID: `5125044838`
- Deployed ref: `9888054de4af4df8d2ad32350b4deaa4c3e682ef`
- State: `success`
- Description: `Deployment has completed`
- Deployment URL:
  `https://stroy-rayon-react-e52kzs5h2-adyl-1991s-projects.vercel.app`
- Production alias: `https://stroy-rayon-react.vercel.app`

Production alias smoke:

- `/`: HTTP 200
- `/admin/login`: HTTP 200
- `/robots.txt`: HTTP 200
- `/sitemap.xml`: HTTP 200

The live bundle is `assets/index-DZvTF_OK.js`, matching the locally verified
Stage 23 build artifact name. Admin order modules are present.

## 4. Previous exact error and fix

Previous Vercel build error:

```text
[UNRESOLVED_IMPORT] Could not resolve '../api/adminApi'
[UNRESOLVED_IMPORT] Could not resolve '../api/productsApi'
[UNRESOLVED_IMPORT] Could not resolve '../api/ordersApi'
```

Root cause:

```text
.vercelignore: api
```

The unanchored pattern removed both the root backend directory and frontend
`src/api` modules.

Fix:

```text
/api
/docs
/reports
/scripts
/dist
```

Root anchoring preserves all five frontend `src/api` modules while excluding
only root-level deployment-irrelevant directories.

## 5. Confirmed blocker closed

Confirmed closed:

- Vercel no longer removes `src/api`;
- the fresh production build completes;
- the production alias serves the new frontend;
- public and admin routes are available through the SPA deployment.

No storefront or admin UX change was required.

## 6. Production environment finding

The fresh Vercel build succeeded, but the live JavaScript bundle still contains
the `localhost:4000` API fallback and contains no
`https://api.stroyrayon.kg/api` production URL.

Therefore the build blocker is closed, but production API integration is not
ready. The owner must set these Vercel Production environment variables and
redeploy after the backend URL exists:

- `VITE_USE_API=true`
- `VITE_API_BASE_URL=https://api.stroyrayon.kg/api`
- `VITE_SITE_URL=https://stroyrayon.kg`
- `VITE_API_TIMEOUT_MS=5000`
- `VITE_ADMIN_TOKEN_STORAGE_KEY=stroyrayon_admin_token`

## 7. Commands run

Before push:

- `git status --short`
- `git log -1 --oneline`
- `git diff --stat`
- `git diff --check`
- `git show --name-only 9888054...`
- `git rev-list --count origin/main..main`

Push:

- `git push origin main` — passed

Verification:

- GitHub deployments API polling — fresh deployment found;
- terminal Vercel state — `success`;
- production alias HTTP smoke — passed;
- live bundle inspection — Stage 23 asset served, admin modules present;
- production API URL inspection — missing; localhost fallback remains.

No new source fix was necessary after the successful Vercel deployment, so the
full local check suite was not rerun in Stage 24. Stage 23 had already passed:

- catalog validation;
- sitemap generation with 343 URLs;
- frontend lint/build;
- filtered Vercel-tree clean build;
- backend tests 27/27;
- Prisma validation;
- backend production start/health smoke.

## 8. Files changed

Stage 24 local report only:

- `reports/stage24-vercel-fresh-build-verification.md`

The report is not part of the already pushed Stage 23 commit.

## 9. Remaining blockers

1. Create the Render Blueprint and production PostgreSQL database.
2. Set backend production environment and bootstrap administrator credentials.
3. Apply seven migrations and seed/import 179 products.
4. Obtain the backend public URL, set Vercel production env, and redeploy.
5. Configure frontend/API DNS and HTTPS, then run production Buyer/Admin/Security
   E2E.

The separately reported backend dependency security upgrade remains a
before-public-launch engineering/risk item. It did not block the Vercel build
and was not expanded into a framework refactor in Stage 24.

Remaining production deployment blocker count: **5**.

## 10. Next owner actions

1. Sign in to Render.
2. Create the Blueprint from root `render.yaml`.
3. Confirm the selected Render web/database plans.
4. Create production PostgreSQL.
5. Set backend env and bootstrap admin values.
6. Verify migrations and the 179-product seed.
7. Obtain the Render backend URL.
8. Set Vercel Production env and redeploy.
9. Add exact Vercel/Render records in the domain DNS panel.
10. Run the final production Buyer/Admin/Security E2E.
