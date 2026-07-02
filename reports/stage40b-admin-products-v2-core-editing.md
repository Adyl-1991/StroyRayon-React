# Stage 40B - Admin Products v2 Core Editing

Дата: 2026-07-02

## 1. Scope

Stage 40B был выполнен локально как этап Admin Products v2 Core Editing.

Не делалось:

- production deploy;
- DNS/hosting changes;
- массовый импорт/export;
- variants/типоразмеры v2;
- полноценная RBAC-система;
- редизайн публичного сайта;
- новые marketing pages;
- fake production success.

## 2. Context Checked

Прочитаны обязательные файлы:

- `reports/stage40a-admin-crm-audit.md`
- `docs/STROYRAYON_PROJECT_REPORT.md`
- `reports/stage38-production-stabilization.md`
- `reports/stage39-server-hosting-runbook.md`

Stage 40A подтвердил, что CRM находится внутри админки: React routes под `/admin/*`, backend endpoints под `/api/admin/*`.

## 3. What Was Implemented

`/admin/products/:id` теперь является полноценной страницей редактирования существующего товара.

Реализовано:

- редактирование title KG, title RU, slug, SKU, category, brand, unit, active/inactive, admin note;
- сохранение цены, физического остатка и stock status через общую форму без поломки прежней бизнес-логики;
- редактирование short description, full description KG, full description RU;
- key/value specs editor с добавлением, изменением и удалением строк;
- documents MVP: title, url, type/label, sort order на backend;
- gallery MVP: просмотр изображений, upload нового фото, alt text, выбор главного фото, удаление изображения из товара без физического удаления файла;
- новый protected endpoint `PATCH /api/admin/products/:id`;
- public product API и product page теперь получают и показывают documents;
- product page скрывает блок документов, если документов нет;
- admin product flow QA расширен на редактирование существующего товара.

## 4. Files Changed

Backend:

- `api/prisma/schema.prisma`
- `api/prisma/seed.ts`
- `api/prisma/migrations/20260702160000_admin_products_v2_core_editing/migration.sql`
- `api/src/modules/admin-products/dto/update-admin-product.dto.ts`
- `api/src/modules/admin-products/admin-products.controller.ts`
- `api/src/modules/admin-products/admin-products.service.ts`
- `api/src/modules/admin-products/admin-products.service.spec.ts`
- `api/src/modules/products/products.service.ts`

Frontend:

- `src/api/adminApi.js`
- `src/admin/AdminProductDetailPage.jsx`
- `src/pages/ProductPage.jsx`
- `src/styles/admin.css`

QA/reporting:

- `scripts/admin-product-flow-qa.mjs`
- `reports/stage40b-admin-products-v2-core-editing.md`

## 5. Backend API

Added endpoint:

- `PATCH /api/admin/products/:id`

The endpoint remains protected by `AdminAuthGuard` through the existing admin products controller guard.

Payload supports:

- core fields: `catalogNodeId`, `brandId`, `titleKg`, `titleRu`, `slug`, `sku`, `unit`, `isActive`, `adminNote`;
- price/stock fields: `price`, `stockQuantity`, `stockStatus`;
- descriptions: `shortDescriptionKg`, `descriptionKg`, `descriptionRu`;
- `specs` as key/value rows;
- `documents` as title/url/type/sortOrder rows;
- `images` as src/alt/type/sortOrder rows.

Validation/normalization:

- title KG and slug must not be empty;
- SKU is unique when provided;
- slug is unique;
- category and brand must exist and be active when set;
- stock cannot be lower than reserved quantity;
- specs rows with empty key/value are dropped;
- document rows with empty title/url are dropped;
- document URLs accept safe `http://`, `https://`, or absolute site paths such as `/docs/file.pdf`;
- image rows with empty src are dropped;
- first gallery image is normalized as `MAIN`;
- physical upload files are not deleted when an image is removed from a product.

## 6. Prisma Migration

Migration added:

- `api/prisma/migrations/20260702160000_admin_products_v2_core_editing/migration.sql`

Schema changes:

- added `Product.descriptionRu`;
- added enum `ProductDocumentType`;
- added `ProductDocument` model/table;
- added `Product.documents` relation.

Data migration:

- existing `specs.descriptionRu` values are backfilled into `Product.descriptionRu`;
- legacy `descriptionRu` key is removed from `Product.specs` where present.

This avoids continuing to store RU description inside a random specs JSON key.

## 7. Data Storage Model

Descriptions:

- KG short description: `Product.shortDescriptionKg`;
- KG full description: `Product.descriptionKg`;
- RU full description: `Product.descriptionRu`.

Specs:

- still stored in `Product.specs` JSON as a normalized key/value object;
- admin UI edits specs as rows and backend drops empty rows before saving;
- public product page continues rendering specs as a table.

Documents:

- stored in new `ProductDocument` table;
- fields: `title`, `url`, `type`, `sortOrder`;
- public product page renders documents only when at least one document exists.

Images:

- still stored in `ProductImage`;
- gallery MVP recreates product image rows from submitted normalized images;
- image upload files remain in `api/uploads/products` locally;
- removing an image from product does not delete the physical file.

## 8. Product Edit UI

`/admin/products/:id` now has CRM-style sections:

- Основное;
- Цена и остаток;
- Описание;
- Характеристики;
- Документы;
- Фото;
- Служебные данные.

UI behavior:

- loading state while product/options are fetched;
- error state when loading or saving fails;
- success message after save;
- single `Сохранить` action;
- `Открыть на сайте` link;
- inline field validation through browser required fields and backend validation messages;
- category and brand selects use admin product options;
- image upload uses existing `FormData` helper and preview flow.

SEO section was not added in this stage because the current schema only has partial KG SEO fields and Stage 40B focused on core product editing. SEO editing should be handled deliberately in Stage 40C.

## 9. QA Commands

Backend:

- `npm.cmd --prefix api run build` - passed.
- `npm.cmd --prefix api test` - passed, 32/32 tests.
- `npm.cmd --prefix api run lint` - passed.

Frontend:

- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run qa:customer` - passed, 1762 checks, 0 failed.
- `npm.cmd run qa:admin-product-flow` - passed, 36 checks, 0 failed.

Additional local DB step:

- `cd api && npm.cmd exec prisma migrate deploy` - passed.

Frontend build note:

- Vite build still emits the existing non-blocking large chunk warning for the main JS bundle.

## 10. Admin Product Flow QA Coverage

Expanded `qa:admin-product-flow` now verifies:

- admin login;
- product creation;
- product detail opening;
- title KG/RU edit;
- short/full description edit;
- specs edit;
- document add;
- image upload from product detail;
- save through `PATCH /api/admin/products/:id`;
- public API reflects edited title, description, specs, documents, and images;
- public product page displays edited title/spec/document/image;
- price, stock and active-state behavior still work;
- test data is cleaned up.

Final QA result:

```json
{
  "passed": true,
  "apiBaseUrl": "http://127.0.0.1:4027/api",
  "siteBaseUrl": "http://127.0.0.1:4187",
  "checks": 36,
  "failedChecks": 0,
  "issues": [],
  "cleanupWarnings": []
}
```

## 11. Remaining Blockers

Production blockers remain unchanged:

- backend hosting/server is not created;
- production PostgreSQL is not created;
- `api.stroyrayon.kg` DNS target is unknown until hosting exists;
- production upload storage decision is still pending;
- no production deploy was done in Stage 40B.

Admin/Product blockers left for later:

- variants/типоразмеры are not implemented;
- RBAC/permission checks are still not enforced for product editing;
- product change audit log is not implemented;
- SEO editor is still pending;
- image manager is MVP only and does not support full reorder UX, dimensions, cleanup, or object storage;
- bulk import/export and product quality indicators remain future work.

## 12. Recommended Stage 40C

Recommended next scope:

- SEO editor for product meta fields;
- variants/типоразмеры model and UI;
- RBAC/permission enforcement before destructive or bulk actions;
- product audit log for admin changes;
- product quality indicators in admin products list;
- object storage/S3-compatible upload implementation;
- more complete gallery manager with reorder, replace, remove, and cleanup policy.

## 13. Commit

Commit hash: reported in the final Codex response after commit finalization.

Note: a final git commit hash cannot be embedded inside a file that belongs to the same commit without changing that commit hash.

## 14. Conclusion

Stage 40B meets the core success criterion locally: the shop owner can open an existing product in admin and edit core fields, descriptions, characteristics, documents, and photos without programmer involvement.

The public product API and product page display the updated data correctly and avoid empty document blocks.
