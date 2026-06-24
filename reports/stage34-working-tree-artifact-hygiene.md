# Stage 34 - Working Tree Artifact Hygiene + QA Baseline

## 1. Summary

Stage 34 cleaned the working tree after the Stage 33 mobile polish pass. No storefront app code, backend code, product data, product images, Render, PostgreSQL, or Vercel environment settings were changed.

The dirty working tree was caused by old generated visual audit reports, screenshots, Chrome profile folders, and a visual audit zip bundle. Those generated artifacts were either restored to the committed baseline or removed locally. `.gitignore` now blocks future generated visual-audit image/cache artifacts from reappearing as untracked files.

## 2. Starting git status

Starting commit:

- `bb93667 Polish mobile storefront UX`

Starting dirty state:

- no app code changes under `src/**`;
- no backend code changes under `api/**`;
- 150 tracked report/visual-audit files modified;
- untracked generated screenshot/cache folders;
- untracked visual audit zip bundle;
- two untracked generated audit markdown files.

## 3. Dirty files classification

### A. App code

None.

No dirty files were found in:

- `src/**`
- `api/**`
- `package.json`
- app config files

### B. Safe reports

Generated/untracked report documents found:

- `reports/production-audit/stroyrayon-roadmap-from-constitution.md`
- `reports/visual-audit/storefront-visual-mobile-roadmap.md`

Decision: cleaned as generated stage artifacts because they were untracked and not part of the Stage 34 commit scope. Their key conclusions were already carried forward into Stage 33 and this hygiene report.

### C. Generated screenshots / visual artifacts

Tracked modified artifacts restored to HEAD:

- `reports/visual-audit/screenshots/**`
- `reports/visual-audit/visual-audit-summary.json`
- `reports/visual-audit/visual-audit.html`
- `reports/visual-audit-smoke/visual-smoke.md`
- `reports/content-audit/stage15-global-content-audit.md`
- `reports/product-images/high-priority-webp-checklist.md`

Untracked generated artifacts removed locally:

- `reports/shtukaturka-audit/`
- `reports/stage1-etalon-audit/`
- `reports/stage5b-audit/`
- `reports/visual-audit/storefront-screenshots/`
- `reports/visual-audit.zip`

### D. Temp/build/cache

Removed local generated Chrome/audit cache folders inside:

- `reports/stage1-etalon-audit/chrome-*`

No `node_modules`, `dist`, `test-results`, or `playwright-report` files were staged.

### E. Sensitive files

No sensitive dirty files were found or staged:

- no `.env`;
- no `.env.local`;
- no token dump;
- no database URL;
- no password file.

## 4. Files ignored

Added `.gitignore` coverage for generated visual-audit outputs:

- `reports/visual-audit/**/*.png`
- `reports/visual-audit/**/*.jpg`
- `reports/visual-audit/**/*.jpeg`
- `reports/visual-audit/**/*.webp`
- `reports/visual-audit/**/screenshots/`
- `reports/visual-audit/storefront-screenshots/`
- `reports/visual-audit.zip`
- `reports/**/chrome-profile*/`
- `reports/**/chrome-debug-profile*/`

Existing ignore coverage already included env files, logs, `node_modules`, `dist`, and local visual audit root screenshots.

## 5. Files cleaned

Cleaned by restoring tracked generated changes:

- old tracked visual audit screenshots;
- generated visual audit HTML/JSON summary;
- old generated report/checklist diffs.

Cleaned by deleting untracked generated artifacts:

- old screenshot-only audit directories;
- old Chrome profile/cache audit directories;
- visual audit zip bundle;
- untracked generated visual/mobile roadmap reports.

## 6. Files intentionally left untracked

None.

After cleanup, no untracked generated artifacts remained.

## 7. Sensitive file check

Sensitive file patterns were checked through `git status --short` and the final staged file list.

No `.env`, token, password, credential, or DB URL file was staged or committed.

## 8. App code change check

No app or backend source file was changed in Stage 34.

Only these files are intended for commit:

- `.gitignore`
- `reports/stage34-working-tree-artifact-hygiene.md`

## 9. QA baseline result

Passed.

- `npm.cmd run validate:catalog` - passed, 0 warnings
- `npm.cmd run generate:sitemap` - passed, 341 URLs, 0 warnings
- `npm.cmd run lint` - passed
- `npm.cmd run build` - passed with the existing large JavaScript chunk warning
- `npm.cmd run qa:stage31` - passed, 400 checks, 0 issues
- `npm.cmd run qa:customer` - passed, 1762 checks, 0 issues
- `cd api && npm.cmd test` - passed, 29/29
- `cd api && npx.cmd prisma validate` - passed

`qa:customer` was run with elevated process permissions because the script needs to launch and connect to a local headless Chrome debugging port.

## 10. Commands run

- `git status --short`
- `git log -1 --oneline`
- `git diff --stat`
- `git diff --check`
- `Get-Content .gitignore`
- artifact inspection with `Get-ChildItem`
- `git restore` for tracked generated report/screenshot artifacts
- safe local artifact cleanup with resolved workspace path checks
- `npm.cmd run validate:catalog`
- `npm.cmd run generate:sitemap`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run qa:stage31`
- `npm.cmd run qa:customer`
- `cd api && npm.cmd test`
- `cd api && npx.cmd prisma validate`

## 11. Final git status

Final pre-commit status is expected to contain only:

- `.gitignore`
- `reports/stage34-working-tree-artifact-hygiene.md`

Generated screenshots, zip files, Chrome profiles, and old audit folders are not staged.

## 12. Remaining owner/manual action

No owner action is required for artifact cleanup.

Remaining product work is unchanged from earlier stages:

- production backend/Render/PostgreSQL/Vercel API connection;
- production product image coverage;
- admin/CRM production expansion;
- eventual JavaScript chunk/code-splitting optimization.
