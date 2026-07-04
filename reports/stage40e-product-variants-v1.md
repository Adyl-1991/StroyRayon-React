# Stage 40E - Product Variants / Типоразмеры v1

Дата: 2026-07-04

## 1. Scope

Stage 40E выполнен локально. Production deploy, DNS, hosting и production database changes не выполнялись.

Сервер/backend hosting всё ещё не создан, production PostgreSQL отсутствует, DNS target для `api.stroyrayon.kg` неизвестен. Live production API нельзя считать работающим.

Не делалось:

- object storage/S3 migration;
- bulk import/export;
- полноценный variants matrix configurator;
- редизайн публичного сайта;
- production deploy или fake production success.

## 2. Implemented

Реализовано:

- новая Prisma model `ProductVariant`;
- связь `Product -> ProductVariant[]`;
- связь `OrderItem -> ProductVariant?`;
- variant-level price, SKU, unit, stock quantity, reserved quantity, stock status, active flag, sort order and specs;
- admin endpoints для создания и обновления вариантов;
- RBAC checks для variant content/commercial/active fields;
- audit log actions for variant create/update/price/stock/active changes;
- public product API returns only active variants;
- product page uses backend variants in the existing variant selector;
- cart stores selected variant id/title/SKU;
- checkout sends `variantId`;
- order creation recalculates price from DB variant, not frontend payload;
- order creation reserves variant stock when a variant is selected;
- admin order detail shows selected variant;
- admin product detail includes a working variants editor;
- admin products list shows variant count/status;
- QA coverage for create/admin/public/cart/checkout variant flow.

## 3. Files Changed

Backend:

- `api/prisma/schema.prisma`
- `api/prisma/migrations/20260703110000_product_variants_v1/migration.sql`
- `api/src/modules/admin-products/dto/admin-product-variant.dto.ts`
- `api/src/modules/admin-products/admin-products.controller.ts`
- `api/src/modules/admin-products/admin-products.service.ts`
- `api/src/modules/admin-products/admin-products.service.spec.ts`
- `api/src/modules/admin-orders/admin-orders.service.ts`
- `api/src/modules/orders/dto/create-order-item.dto.ts`
- `api/src/modules/orders/orders.service.ts`
- `api/src/modules/orders/whatsapp-order.service.ts`
- `api/src/modules/products/products.service.ts`
- `api/src/modules/stock/stock.service.ts`
- `api/src/modules/stock/stock.service.spec.ts`

Frontend:

- `src/api/adminApi.js`
- `src/admin/AdminProductDetailPage.jsx`
- `src/admin/AdminProductsPage.jsx`
- `src/admin/AdminOrderDetailPage.jsx`
- `src/components/product/ProductInfo.jsx`
- `src/components/cart/CartItem.jsx`
- `src/pages/CheckoutPage.jsx`
- `src/services/cartService.js`
- `src/services/productService.js`
- `src/services/whatsappService.js`
- `src/styles/admin.css`

QA/report:

- `scripts/admin-product-flow-qa.mjs`
- `reports/stage40e-product-variants-v1.md`

## 4. Prisma Migration

Migration added:

- `api/prisma/migrations/20260703110000_product_variants_v1/migration.sql`

Schema changes:

- added `ProductVariant`;
- added `Product.variants`;
- added `OrderItem.variantId`;
- added `OrderItem.variantTitleSnapshot`;
- added `OrderItem.variantSkuSnapshot`;
- added indexes for variant product/sort, active state, stock status, and order item variant lookup.

Variant fields:

- `titleKg`;
- `titleRu`;
- `sku`;
- `price`;
- `currency`;
- `unit`;
- `stockQuantity`;
- `reservedQuantity`;
- `stockStatus`;
- `isActive`;
- `sortOrder`;
- `specs`.

Local migration command:

- `cd api && npm.cmd exec prisma migrate deploy` - passed.

## 5. Backend API

Added protected admin endpoints:

- `POST /api/admin/products/:id/variants`
- `PATCH /api/admin/products/:id/variants/:variantId`

Both endpoints stay under `AdminAuthGuard`.

RBAC:

- variant title/SKU/unit/specs/sort order require `products:content`;
- variant price/stock/stock status require `products:commercial`;
- variant active/inactive changes require `products:active`;
- creating a variant requires content and commercial permissions, plus active permission if active state is submitted.

Validation:

- variant title KG is required;
- unit is required;
- price must be positive;
- stock cannot be negative;
- stock cannot be lowered below reserved quantity;
- SKU is normalized to uppercase;
- SKU must not duplicate another variant SKU;
- SKU must not duplicate any product SKU, including the parent product SKU;
- empty variant specs are not saved.

Audit log:

- `variant_created`;
- `variant_updated`;
- `variant_price_changed`;
- `variant_stock_changed`;
- `variant_activated`;
- `variant_deactivated`.

## 6. Order And Stock Flow

Checkout payload can now include `variantId`.

Order creation behavior:

- if `variantId` is provided, backend loads the variant and its parent product;
- backend checks that optional `productId` or `slug` matches the variant parent product;
- unit price comes from `ProductVariant.price`;
- stock status and availability come from variant stock fields;
- reservation increments `ProductVariant.reservedQuantity`;
- product-level stock remains the fallback when no variant is selected;
- order items store product snapshots and variant snapshots separately.

Admin order status behavior:

- cancelling an order releases variant reservations when `variantId` exists;
- delivering an order decrements variant physical stock and reserved quantity when `variantId` exists;
- product-level fulfillment remains unchanged for non-variant order items.

## 7. Public Product And Storefront Flow

Public `GET /api/products/:slug` now returns active variants only.

Product page:

- existing selector now uses backend variants;
- inactive variants are hidden by the public API;
- out-of-stock variants are disabled through existing product UI behavior;
- price/unit/SKU switch according to selected variant.

Cart:

- stores `variantId`;
- stores localized variant title fields;
- stores `variantSku`;
- displays variant title and SKU.

Checkout:

- sends `variantId`;
- sends variant SKU for visible customer context;
- backend still ignores frontend price and recalculates from DB.

WhatsApp:

- inquiry/order text includes selected variant title and variant SKU.

## 8. Admin UI

`/admin/products/:id` now includes section:

- `Варианты / типоразмеры`

Admin can:

- add variant;
- edit title KG/RU;
- edit SKU;
- edit price;
- edit unit;
- edit stock quantity;
- edit stock status;
- edit sort order;
- edit active state;
- edit variant specs.

Permission-aware UI:

- content fields disabled without content permission;
- commercial fields disabled without commercial permission;
- active checkbox/deactivate action disabled without active permission;
- viewer role cannot edit variants.

`/admin/products` now shows variant summary:

- active/total variants;
- inactive count;
- simple variant issue marker when variant data is incomplete.

## 9. QA Results

Backend:

- `npm.cmd --prefix api run prisma:generate` - passed.
- `cd api && npm.cmd exec prisma migrate deploy` - passed.
- `npm.cmd --prefix api run build` - passed.
- `npm.cmd --prefix api test` - passed, 42/42 tests.
- `npm.cmd --prefix api run lint` - passed.

Frontend:

- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run qa:customer` - passed, 1762 checks, 0 failed.
- `npm.cmd run qa:admin-product-flow` - passed, 53 checks, 0 failed.

Diff hygiene:

- `git diff --check` - passed with normal Windows LF/CRLF warnings only.

Frontend build note:

- Vite still reports the existing non-blocking large chunk warning.

## 10. QA Coverage Added

Expanded `qa:admin-product-flow` verifies:

- admin creates a variant from product detail;
- variant create writes audit log;
- public product API exposes active variant;
- product page renders variant selector;
- selected variant is added to cart;
- cart preserves variant title and SKU;
- checkout sends selected variant;
- WhatsApp preview includes selected variant title and SKU;
- existing product create/edit/upload/SEO/specs/documents/RBAC checks still pass.

Backend tests now cover:

- admin variant create with audit log;
- admin variant commercial update;
- stock cannot be lowered below reserved variant quantity;
- variant permission split;
- variant SKU uniqueness against variants and products;
- atomic variant reservation.

## 11. Remaining Blockers

Production blockers remain unchanged:

- backend hosting/server is not created;
- production PostgreSQL is not created;
- `api.stroyrayon.kg` DNS target is unknown;
- production upload storage decision is still pending;
- no production deploy was done in Stage 40E.

Admin/product blockers left for later:

- variants are v1 list rows, not a full matrix configurator;
- create page does not yet have full variant creation parity;
- variant image per option is not implemented;
- variant-level SEO is not implemented;
- object storage/S3 upload migration is not implemented;
- bulk import/export is not implemented;
- richer audit diff UI remains future work.

## 12. Recommended Stage 40F

Recommended next scope:

- create-page variants parity if needed for first-time product entry;
- stronger gallery manager and image cleanup policy;
- object storage/S3-compatible upload implementation;
- product import/export planning;
- richer audit compare view;
- production hosting/DB/DNS execution when owner has chosen hosting.

## 13. Commit

Commit hash: reported in the final Codex response after commit finalization.

Note: a final git commit hash cannot be embedded inside a file that belongs to the same commit without changing that commit hash.

## 14. Conclusion

Stage 40E meets the local v1 success criterion: product variants/типоразмеры are persistent, editable in admin, visible on the public product page, preserved in cart/checkout, priced from the backend, reserved at variant stock level, visible in CRM order detail, and covered by automated QA.
