# Stage 40F - Object Storage + Admin Gallery v2

Дата: 2026-07-04

## 1. Scope

Stage 40F выполнен локально. Production deploy, DNS, hosting, production PostgreSQL и реальное создание production bucket не выполнялись.

Production blockers остаются прежними:

- backend hosting/server не создан;
- production PostgreSQL не создан;
- DNS target для `api.stroyrayon.kg` неизвестен;
- production object storage credentials/bucket не настроены.

Stage 40F не заявляет fake production success. S3-compatible adapter добавлен как foundation, но реальный production bucket не тестировался, потому что credentials отсутствуют.

## 2. Implemented

Реализовано:

- backend storage abstraction через `StorageService`;
- local storage driver для dev/QA;
- S3-compatible storage foundation через env config и AWS Signature v4 PUT/DELETE;
- fail-fast validation for incomplete `STORAGE_DRIVER=s3` config;
- image upload validation: only `image/jpeg`, `image/png`, `image/webp`, max 5 MB;
- normalized server-side object keys under `products/...`;
- ProductImage storage metadata;
- protected product gallery endpoints;
- safe detach/delete policy;
- Admin Gallery v2 on `/admin/products/:id`;
- upload one or multiple images;
- save image alt;
- set main image;
- reorder via up/down buttons;
- detach image from product;
- role-aware disabled gallery controls;
- automated backend and browser QA coverage.

## 3. Files Changed

Backend:

- `api/prisma/schema.prisma`
- `api/prisma/migrations/20260704100000_object_storage_admin_gallery_v2/migration.sql`
- `api/src/main.ts`
- `api/src/modules/storage/storage.module.ts`
- `api/src/modules/storage/storage.service.ts`
- `api/src/modules/storage/storage.service.spec.ts`
- `api/src/modules/admin-products/dto/product-image-gallery.dto.ts`
- `api/src/modules/admin-products/admin-products.module.ts`
- `api/src/modules/admin-products/admin-products.controller.ts`
- `api/src/modules/admin-products/admin-products.service.ts`
- `api/src/modules/admin-products/admin-products.service.spec.ts`

Frontend:

- `src/api/client.js`
- `src/api/adminApi.js`
- `src/admin/AdminProductDetailPage.jsx`

QA/report:

- `scripts/admin-product-flow-qa.mjs`
- `reports/stage40f-object-storage-admin-gallery-v2.md`

## 4. Migration Details

Migration added:

- `api/prisma/migrations/20260704100000_object_storage_admin_gallery_v2/migration.sql`

`ProductImage` fields added:

- `storageKey String?`
- `storageDriver String @default("legacy")`
- `originalName String?`
- `size Int?`
- `updatedAt DateTime @updatedAt`

Index added:

- `ProductImage_storageKey_idx`

Existing product images are preserved. Existing rows default to `storageDriver='legacy'` and `storageKey=null`, so Stage 40F will not physically delete old static/legacy images.

## 5. Env Variables

Storage env supported:

```env
STORAGE_DRIVER=local
STORAGE_LOCAL_ROOT=uploads
STORAGE_PUBLIC_BASE_URL=

S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
```

Also still supported:

```env
PUBLIC_API_ORIGIN=https://api.stroyrayon.kg
```

Behavior:

- default driver is `local`;
- local files are stored under `STORAGE_LOCAL_ROOT/products`;
- Nest static serving uses `STORAGE_LOCAL_ROOT` at `/uploads/...`;
- if `STORAGE_PUBLIC_BASE_URL` is set, local public URLs use it;
- otherwise local public URLs use `PUBLIC_API_ORIGIN` or request origin;
- if `STORAGE_DRIVER=s3` and required S3 env is missing, backend fails fast.

## 6. Backend API

Existing compatibility endpoint remains:

- `POST /api/admin/products/images`

New protected gallery endpoints:

- `POST /api/admin/products/:id/images`
- `PATCH /api/admin/products/:id/images/reorder`
- `PATCH /api/admin/products/:id/images/:imageId`
- `DELETE /api/admin/products/:id/images/:imageId`

RBAC:

- gallery upload requires `products:upload` and `products:content`;
- metadata/main/reorder/delete require `products:content`;
- viewer role is blocked.

Audit actions:

- `image_added`
- `image_updated`
- `image_reordered`
- `image_deleted`

## 7. Storage Driver Behavior

Local driver:

- validates MIME/size;
- generates normalized unique key under `products/...`;
- writes file to `process.cwd()/STORAGE_LOCAL_ROOT/products`;
- returns public URL/path and storage metadata.

S3-compatible driver:

- validates MIME/size;
- requires endpoint/region/bucket/access key/secret/public base URL;
- signs PUT and DELETE requests with AWS Signature v4;
- stores object by generated key;
- returns public URL from `S3_PUBLIC_BASE_URL`.

Production note:

- real S3/R2/Spaces bucket was not created or tested in Stage 40F.
- S3 success must be verified after the owner provides real credentials.

## 8. Safe Delete Policy

Delete endpoint detaches the `ProductImage` row first.

Physical delete happens only when:

- `storageKey` exists;
- `storageDriver` is not `legacy`;
- image is not a placeholder/static `/images/...` asset;
- no other `ProductImage` row references the same `storageKey`.

Protected from physical deletion:

- placeholder images;
- legacy/static catalog images;
- rows without `storageKey`;
- shared images still referenced by another row.

If physical delete is not safe, the API detaches the image and returns a non-deleted storage reason.

## 9. Admin UI Behavior

`/admin/products/:id` gallery section now supports:

- multiple file upload;
- immediate attach after upload;
- preview;
- alt editing and save;
- set main image;
- up/down reorder;
- detach image;
- disabled controls without permissions.

General product save no longer resubmits/recreates image rows from the whole form. Images are now managed through gallery endpoints, which preserves storage metadata.

Existing sections remain intact:

- core fields;
- price/stock;
- descriptions;
- specs;
- documents;
- variants;
- SEO;
- audit history.

## 10. Storefront Impact

Public storefront was not redesigned.

Verified:

- product page still renders product image/gallery;
- uploaded image URL is served locally through `/uploads/...`;
- no broken images in QA;
- cart/checkout remain unaffected;
- variants remain unaffected.

## 11. QA Results

Backend:

- `npm.cmd --prefix api run prisma:generate` - passed.
- `cd api && npm.cmd exec prisma migrate deploy` - passed, no pending migrations after local apply.
- `npm.cmd --prefix api run build` - passed.
- `npm.cmd --prefix api test` - passed, 49/49 tests.
- `npm.cmd --prefix api run lint` - passed.

Frontend:

- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run qa:customer` - passed, 1762 checks, 0 failed.
- `npm.cmd run qa:admin-product-flow` - passed, 54 checks, 0 failed.

Diff hygiene:

- `git diff --check` - passed with normal Windows LF/CRLF warnings only.

Frontend build note:

- Vite still reports the existing non-blocking large chunk warning.

## 12. QA Coverage Added

Backend tests now cover:

- unsupported MIME rejection;
- oversized image rejection;
- local storage object write;
- incomplete S3 config fail-fast;
- product image record creation;
- main image selection;
- reorder;
- safe detach/delete;
- legacy/static image physical delete protection;
- viewer role block.

Admin flow QA now verifies:

- login;
- product detail open;
- image upload into gallery;
- alt save;
- set main image;
- reorder;
- detach image;
- product detail still saves;
- variants section still works;
- storefront product image remains unbroken.

## 13. Remaining Blockers

Production blockers:

- backend hosting/server is not created;
- production PostgreSQL is not created;
- `api.stroyrayon.kg` DNS target is unknown;
- real object storage bucket/credentials are not configured;
- production S3/R2/Spaces upload was not tested;
- no production deploy was done in Stage 40F.

Admin/product blockers:

- variant-level images are not implemented;
- bulk import/export is not implemented;
- richer gallery UI with drag-and-drop is not implemented;
- full image cleanup dashboard is not implemented;
- create-page gallery still uses compatibility upload flow.

## 14. Recommended Stage 40G

Recommended next scope:

- choose production hosting and object storage provider;
- configure real S3-compatible bucket credentials;
- run live storage smoke test after backend hosting exists;
- create-page gallery parity if first-time product entry needs multiple photos;
- richer audit diff view;
- product import/export planning.

## 15. Commit

Commit hash: reported in the final Codex response after commit finalization.

Note: a final git commit hash cannot be embedded inside a file that belongs to the same commit without changing that commit hash.

## 16. Conclusion

Stage 40F meets the local success criterion: product image storage now has a production-oriented abstraction, local uploads still work, S3-compatible configuration is prepared with fail-fast behavior, and admin product detail has a safer Gallery v2 for upload, metadata, main image, ordering, and detach operations.
