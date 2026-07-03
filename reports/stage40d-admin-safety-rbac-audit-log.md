# Stage 40D - Admin Safety: RBAC, Product Audit Log and Change History

Дата: 2026-07-03

## 1. Scope

Stage 40D выполнен локально. Production deploy, DNS, hosting и production database changes не выполнялись.

Сервер/backend hosting всё ещё не создан, production PostgreSQL отсутствует, DNS target для `api.stroyrayon.kg` неизвестен. Live production API нельзя считать работающим.

## 2. Implemented

Реализовано:

- backend RBAC permission layer для admin roles;
- новый `VIEWER` role;
- role-aware admin profile permissions;
- protected permission checks для orders/products endpoints;
- product audit log table;
- audit logging for product create/update/price/stock/active/note changes;
- endpoint `GET /api/admin/products/:id/audit-log`;
- product detail UI history section;
- role-aware UI controls in product list, product create, product detail, and order detail;
- Stage 40D QA coverage for audit log and RBAC.

## 3. Roles And Permissions

Roles:

- `OWNER`: full admin access.
- `MANAGER`: view/update orders, view products, edit commercial product data, view product audit log.
- `CONTENT`: view/create/content-edit products, upload images, view product audit log.
- `VIEWER`: view orders/products and product audit log only.

Permissions are exposed by `/api/admin/auth/me` as a serializable `permissions` array.

## 4. Backend Protection

Protected through `AdminAuthGuard` plus explicit permission checks:

- orders list/detail: `orders:view`;
- order status/note updates: `orders:update`;
- products list/options/detail: `products:view`;
- product create: `products:create`;
- product image upload: `products:upload`;
- product audit log: `products:audit:view`;
- product price/stock endpoints: `products:commercial`;
- product active endpoint: `products:active`;
- product note endpoint: `products:content`;
- general `PATCH /api/admin/products/:id`: checks payload fields and requires content/commercial/active permissions as needed.

## 5. Product Audit Log

Prisma migration added:

- `api/prisma/migrations/20260703093000_admin_rbac_product_audit_log/migration.sql`

Schema changes:

- added `AdminRole.VIEWER`;
- added `ProductAuditLog`;
- added relations from `Product` and `AdminUser`.

Audit fields:

- `productId`;
- `adminId`;
- `action`;
- `changedFields`;
- `beforeSnapshot`;
- `afterSnapshot`;
- `metadata`;
- `createdAt`.

Logged actions:

- `product_created`;
- `product_updated`;
- `price_changed`;
- `stock_changed`;
- `active_changed`;
- `note_changed`.

Physical upload files are still not deleted by audit/image changes.

## 6. Admin UI

Updated UI behavior:

- Admin header shows current user and role label.
- `/admin/products` hides “Новый товар” without `products:create`.
- `/admin/products/new` blocks create/upload without permissions.
- `/admin/products/:id` disables content, commercial, active and upload actions independently by permission.
- `/admin/products/:id` shows “История изменений”.
- `/admin/orders/:id` disables order status/note updates without `orders:update`.

## 7. Files Changed

Backend:

- `api/prisma/schema.prisma`
- `api/prisma/migrations/20260703093000_admin_rbac_product_audit_log/migration.sql`
- `api/src/modules/auth/admin-permissions.ts`
- `api/src/modules/auth/admin-permissions.spec.ts`
- `api/src/modules/auth/auth.service.ts`
- `api/src/modules/admin-orders/admin-orders.controller.ts`
- `api/src/modules/admin-products/admin-products.controller.ts`
- `api/src/modules/admin-products/admin-products.service.ts`
- `api/src/modules/admin-products/admin-products.service.spec.ts`

Frontend:

- `src/admin/adminPermissions.js`
- `src/admin/AdminLayout.jsx`
- `src/admin/AdminProductsPage.jsx`
- `src/admin/AdminProductCreatePage.jsx`
- `src/admin/AdminProductDetailPage.jsx`
- `src/admin/AdminOrderDetailPage.jsx`
- `src/api/adminApi.js`
- `src/styles/admin.css`

QA/report:

- `scripts/admin-product-flow-qa.mjs`
- `reports/stage40d-admin-safety-rbac-audit-log.md`

## 8. QA Results

Backend:

- `npm.cmd --prefix api run prisma:generate` - passed.
- `npm.cmd exec prisma migrate deploy` from `api/` - passed.
- `npm.cmd --prefix api run build` - passed.
- `npm.cmd --prefix api test` - passed, 38/38 tests.
- `npm.cmd --prefix api run lint` - passed.

Frontend:

- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run qa:customer` - passed, 1762 checks, 0 failed.
- `npm.cmd run qa:admin-product-flow` - passed, 48 checks, 0 failed.

Diff hygiene:

- `git diff --check` - passed with normal Windows LF/CRLF warnings only.

Frontend build note:

- Vite still reports the existing non-blocking large chunk warning.

## 9. QA Coverage Added

`qa:admin-product-flow` now verifies:

- audit log appears in product detail UI;
- audit API records product create/content update;
- audit API records price/stock/active fields;
- `CONTENT` role is blocked from commercial product update;
- `VIEWER` role is blocked from product update;
- `VIEWER` role can still view product list;
- viewer UI disables product edit/upload actions.

Backend tests now cover:

- role permission matrix;
- permission rejection;
- product update permission split;
- product audit log persistence;
- product audit log response shape.

## 10. Remaining Blockers

Production blockers remain unchanged:

- backend hosting/server is not created;
- production PostgreSQL is not created;
- `api.stroyrayon.kg` DNS target is unknown;
- production upload storage decision is still pending;
- no production deploy was done in Stage 40D.

Admin/product blockers left for later:

- variants/типоразмеры are not implemented;
- object storage/S3 upload migration is not implemented;
- bulk import/export is not implemented;
- full audit diff UI is still compact and not a dedicated compare screen;
- image manager remains MVP and does not physically delete files.

## 11. Recommended Stage 40E

Recommended next scope:

- variants/типоразмеры model and UI;
- object storage/S3-compatible upload implementation;
- stronger image manager with reorder/replace/delete policy;
- product import/export planning;
- richer audit diff view and optional admin audit dashboard.

## 12. Commit

Commit hash: reported in the final Codex response after commit finalization.

Note: a final git commit hash cannot be embedded inside a file that belongs to the same commit without changing that commit hash.

## 13. Conclusion

Stage 40D meets the local success criterion: admin product and order actions are now role-aware, product changes leave an audit trail, and the product detail page shows change history for back-office safety.
