# Stage 40C - Admin Product Quality, SEO and Create/Edit Parity

Дата: 2026-07-02

## 1. Scope

Stage 40C был выполнен локально. Production deploy, DNS и hosting changes не выполнялись.

Production server/backend hosting всё ещё не создан. Production PostgreSQL и DNS target для `api.stroyrayon.kg` также отсутствуют, поэтому live production API по-прежнему нельзя считать работающим.

Старые untracked context files не смешивались с feature commit:

- `docs/STROYRAYON_PROJECT_REPORT.md`
- `reports/stage39-server-hosting-runbook.md`

## 2. Implemented

Реализовано:

- thumbnails в `/admin/products`;
- placeholder в списке, если у товара нет реального фото;
- product quality flags в admin products list;
- completeness score в процентах;
- quality filters для missing image/description/specs/documents/SEO, inactive, low stock, out of stock;
- SEO editor на `/admin/products/:id`;
- RU SEO поля в Prisma schema/backend/public API;
- create/edit parity для `/admin/products/new`:
  - brand select;
  - specs editor;
  - documents editor;
  - gallery payload/preview;
  - SEO fields;
  - validation-compatible payload with edit form.

## 3. Files Changed

Backend:

- `api/prisma/schema.prisma`
- `api/prisma/seed.ts`
- `api/prisma/migrations/20260702173000_admin_product_quality_seo/migration.sql`
- `api/src/modules/admin-products/dto/admin-products-query.dto.ts`
- `api/src/modules/admin-products/dto/create-admin-product.dto.ts`
- `api/src/modules/admin-products/dto/update-admin-product.dto.ts`
- `api/src/modules/admin-products/admin-products.service.ts`
- `api/src/modules/admin-products/admin-products.service.spec.ts`
- `api/src/modules/products/products.service.ts`

Frontend:

- `src/admin/AdminProductsPage.jsx`
- `src/admin/AdminProductCreatePage.jsx`
- `src/admin/AdminProductDetailPage.jsx`
- `src/styles/admin.css`

QA:

- `scripts/admin-product-flow-qa.mjs`

Report:

- `reports/stage40c-admin-product-quality-seo.md`

## 4. Prisma Migration

Migration added:

- `api/prisma/migrations/20260702173000_admin_product_quality_seo/migration.sql`

Added fields:

- `Product.seoTitleRu`
- `Product.seoDescriptionRu`

Existing KG SEO fields remain:

- `Product.seoTitleKg`
- `Product.seoDescriptionKg`

RU SEO was added as normal columns, not stored in `specs` or another random JSON field.

Local migration command:

- `cd api && npm.cmd exec prisma migrate deploy` - passed.

## 5. SEO Flow

Admin edit now supports:

- SEO title KG;
- SEO meta description KG;
- SEO title RU;
- SEO meta description RU.

Admin create now supports the same SEO fields.

Backend:

- `POST /api/admin/products` accepts SEO fields.
- `PATCH /api/admin/products/:id` accepts SEO fields.
- `GET /api/admin/products` and `GET /api/admin/products/:id` return SEO status and fields.
- Public `GET /api/products/:slug` returns `seoTitleRu` and `seoDescriptionRu`.

Frontend:

- `getProductSeo(product, locale)` already supported RU SEO;
- public product page now receives backend RU SEO fields and can use them.

## 6. Quality Flags And Completeness

Admin list response now includes:

- `thumbnail`;
- `qualityFlags`;
- `completenessScore`;
- `completenessLabel`;
- `documentCount`;
- `specsCount`;
- `seoStatus`.

Quality flags:

- `missing_image`;
- `missing_description_kg`;
- `missing_description_ru`;
- `missing_specs`;
- `missing_documents`;
- `missing_seo`;
- `inactive`;
- `low_stock`;
- `out_of_stock`.

Completeness score is a simple internal percentage from these checks:

- real photo;
- title KG/RU;
- KG description;
- RU description;
- positive price;
- available stock;
- specs;
- complete SEO;
- documents.

Labels:

- `Хорошо заполнен` at 85%+;
- `Неполный` at 60-84%;
- `Нужны данные` below 60%.

This is admin-only visibility and does not change public catalog behavior.

## 7. Filters Added

New admin query param:

- `quality`

Supported values:

- `missing_image`
- `missing_description`
- `missing_specs`
- `missing_documents`
- `missing_seo`
- `inactive`
- `low_stock`
- `out_of_stock`

Existing filters remain:

- `q`
- `catalogPath`
- `stockStatus`
- `isActive`
- `page`
- `limit`

## 8. Create/Edit Parity

`/admin/products/new` is now closer to `/admin/products/:id`.

Create supports:

- brand select;
- image upload and gallery payload;
- specs key/value rows;
- documents title/url/type rows;
- SEO KG/RU title/meta fields;
- existing category/title/slug/SKU/price/stock/unit/active/admin note fields.

Edit supports the same core content/SEO/specs/documents/images fields through `PATCH /api/admin/products/:id`.

## 9. QA Results

Backend:

- `npm.cmd --prefix api run build` - passed.
- `npm.cmd --prefix api test` - passed, 33/33 tests.
- `npm.cmd --prefix api run lint` - passed.

Frontend:

- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run qa:admin-product-flow` - passed, 41 checks, 0 failed.
- `npm.cmd run qa:customer` - passed, 1762 checks, 0 failed.

Additional:

- `npm.cmd --prefix api run prisma:generate` - passed.
- `cd api && npm.cmd exec prisma migrate deploy` - passed locally.
- `git diff --check` - passed with only normal Windows LF/CRLF warnings.

Frontend build note:

- Vite still reports the existing non-blocking large chunk warning.

## 10. Admin QA Coverage Added

Expanded `qa:admin-product-flow` verifies:

- product create brand select exists;
- create specs/documents/SEO persist into edit form;
- product list shows thumbnail and quality summary;
- quality filter `missing_seo` returns only matching rows when rows are returned;
- edit SEO fields save through product detail;
- public product API exposes edited SEO fields;
- public product page still renders edited specs/documents/images;
- checkout/order flow still works with the created product;
- inactive product remains hidden from public API/search.

## 11. Remaining Blockers

Production blockers:

- backend hosting/server is not created;
- production PostgreSQL is not created;
- `api.stroyrayon.kg` DNS target is still unknown;
- production upload storage decision is still pending;
- no production deploy was done in Stage 40C.

Admin/product blockers:

- variants/типоразмеры are not implemented;
- full RBAC is not implemented;
- product change audit log is not implemented;
- object storage/S3 upload migration is not implemented;
- bulk import/export is not implemented;
- image manager remains MVP and does not physically delete files.

## 12. Recommended Stage 40D

Recommended next scope:

- product variants/типоразмеры model and UI;
- RBAC/permission checks before destructive or bulk actions;
- product audit log for product changes;
- import/export planning;
- object storage/S3-compatible upload implementation;
- stronger image manager with reorder/replace/delete policy.

## 13. Commit

Commit hash: reported in the final Codex response after commit finalization.

Note: a final git commit hash cannot be embedded inside a file that belongs to the same commit without changing that commit hash.

## 14. Conclusion

Stage 40C meets the success criterion locally: the shop owner can open `/admin/products` and immediately see catalog quality problems around photo, descriptions, specs, documents, SEO, activity and stock.

New and existing products can now be filled more completely through admin create/edit flows without programmer intervention.
