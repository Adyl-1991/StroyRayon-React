# Stage 40A - Full Admin/CRM Audit Before Admin Products v2

Дата: 2026-07-02

## 1. Scope

Stage 40A был проведен как audit-only этап перед Admin Products v2.

Не делалось:

- production deploy;
- DNS/hosting changes;
- redesign публичной витрины;
- изменения каталога/товарных данных;
- новые CRM/Admin features.

CRM сейчас реализована внутри админки, не как отдельное приложение: React routes находятся под `/admin/*`, backend endpoints находятся под `/api/admin/*`.

## 2. Context Checked

Прочитаны обязательные файлы:

- `docs/STROYRAYON_PROJECT_REPORT.md`
- `reports/stage38-production-stabilization.md`
- `reports/stage39-server-hosting-runbook.md`

Git/context:

- branch: `main`;
- Stage 38 commit найден: `cf5d736 Stabilize production build and product upload flow`;
- HEAD на момент аудита: `5ff5757 Record Stage 38 commit hash`;
- перед отчетом в working tree уже были untracked context/report files: `docs/STROYRAYON_PROJECT_REPORT.md`, `reports/stage39-server-hosting-runbook.md`.

## 3. Commands Run

Initial PowerShell note:

- `npm --prefix api ...` через `npm.ps1` был заблокирован Windows ExecutionPolicy.
- Те же проверки были перезапущены через `npm.cmd`; это не ошибка проекта.

Backend:

- `npm.cmd --prefix api run build` - passed.
- `npm.cmd --prefix api test` - passed, 31/31 tests.
- `npm.cmd --prefix api run lint` - passed, no warnings reported.

Frontend:

- `npm.cmd run lint` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd run qa:customer` - passed, 1762 checks, 0 failed.
- `npm.cmd run qa:admin-product-flow` - passed, 30 checks, 0 failed.

Frontend build note:

- Vite build emits `dist/index.html`, CSS and JS bundles.
- Non-blocking warning remains: main JS chunk is larger than 500 kB after minification.

## 4. Browser Admin Audit

Ran a local browser/CDP audit with temporary local API/Vite:

- API: `http://127.0.0.1:4039/api`
- Site: `http://127.0.0.1:4199`
- Viewports: `1366`, `1024`, `390`

Routes audited:

- `/admin/login`
- `/admin/orders`
- `/admin/orders/:id`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/:id`

Result:

- passed;
- real order detail covered;
- real product detail covered;
- admin shell/login shell rendered;
- no route-level alert errors;
- no horizontal overflow detected in audited viewports.

Important UX note:

- On mobile, admin tables are intentionally horizontally scrollable inside `.admin-table-wrap`. This avoids page overflow, but order/product list management is still table-heavy and not ideal for daily mobile CRM work.

## 5. Admin Auth Audit

What is good:

- `/admin/login` is separate from public storefront layout.
- `/admin/*` protected routes require a token in `sessionStorage`.
- Backend admin orders/products controllers are guarded by `AdminAuthGuard`.
- Guard verifies `Bearer` token and injects admin identity into request.
- `/admin/auth/me` validates that the admin account is still active.
- `ADMIN_JWT_SECRET` must be at least 32 characters.
- Frontend clears token and redirects to `/admin/login` on API `401`.
- Production CORS forbids wildcard/non-explicit origins.

Gaps before a larger CRM:

- Token is stored in browser `sessionStorage`; acceptable for current internal CRM, but still exposed to XSS if an admin browser session is compromised.
- Backend has `AdminRole`, but roles are not used to restrict actions. Any active admin token can update orders, products, price, stock, active state, notes, and upload images.
- Logout is client-side token removal; backend has no token revocation/session list.
- No rate limiting/brute-force throttling was found on admin login.

Severity:

- Medium before Admin Products v2: add role/permission checks before giving wider product editing/import/delete powers.

## 6. Admin Layout Audit

What is good:

- Admin routes use `AdminLayout` and do not render the public storefront header/footer.
- Navigation is intentionally small: orders, products, logout.
- Desktop and mobile browser audit passed without horizontal page overflow.
- Login page layout is usable on mobile and desktop.

Gaps:

- There is no CRM dashboard/overview; `/admin` redirects directly to `/admin/orders`.
- Header/nav is functional but sparse; as CRM grows it will need clearer sections, user/role context, and possibly active operational counters.
- Some admin UI remains table-first. This is acceptable for desktop operations, but mobile daily use will be slower.

Severity:

- Low/Medium: not blocking Admin Products v2, but should guide later CRM polish.

## 7. Orders CRM Audit

What is good:

- Orders list supports status filtering.
- Orders list shows order number, date, customer, phone, total, status, and stock reservation summary.
- Order detail shows customer, phone, region, address, customer comment, items, totals, status history, stock reservation status, and internal admin note.
- Status transitions are restricted in both UI and backend:
  - `NEW -> PENDING_CONFIRMATION | CONFIRMED | CANCELLED`
  - `PENDING_CONFIRMATION -> CONFIRMED | CANCELLED`
  - `CONFIRMED -> ASSEMBLING | CANCELLED`
  - `ASSEMBLING -> DELIVERED | CANCELLED`
- Cancelling releases reservations.
- Delivering fulfills reservations by decrementing physical and reserved stock.
- Order tests cover auth guard, list/detail/update status/note, snapshots, and stock reservation behavior.

Gaps:

- No search by order number, customer name, or phone.
- No date range filters.
- No direct WhatsApp action in order detail, despite WhatsApp being central to the storefront funnel.
- No payment status workflow.
- No assignment/owner field for managers.
- No bulk operations.
- No editable delivery/payment details after order creation.

Severity:

- Medium for CRM maturity, not a blocker for Admin Products v2.

## 8. Products List Audit

What is good:

- Products list supports search by title, slug, SKU.
- Filters exist for category path, stock status, and active state.
- Table shows category, brand, price, stock/reserved quantity, visibility, image status, updated timestamp.
- Pagination exists.
- Backend validates query params and caps `limit` at 100.

Gaps:

- No product thumbnail in the list, only text image status.
- No explicit quality indicators for missing description/specs/documents/SEO.
- No bulk edit/import/export.
- No quick visibility/stock edits from list.
- Category filter options are based on categories with products, not the complete active tree.

Severity:

- Medium: list is usable, but Admin Products v2 should add quality/status visibility before large catalog operations.

## 9. Product Detail Audit

What is good:

- Existing product detail supports editing:
  - price;
  - physical stock quantity;
  - stock status;
  - active/inactive visibility;
  - internal admin note.
- Stock quantity cannot be set below reserved quantity.
- Inactive products are hidden from public detail/search and server blocks order creation with inactive products.
- Read-only notice clearly says title, slug, category, descriptions, SEO, FAQ, and images are not editable at this stage.

Main Admin Products v2 gap:

- Existing product detail cannot edit title, slug, SKU, category, brand, descriptions, specs, documents, SEO, FAQ, gallery/images, relations, or variants.

Severity:

- High for Admin Products v2 planning, but intentionally not fixed in Stage 40A.

## 10. Product Create Audit

What is good:

- Create form supports category, slug, SKU, image URL, image upload, image alt, price, stock, unit, stock status, active flag, KG/RU titles, KG/RU descriptions, short description, and admin note.
- Slug auto-generation exists.
- Client and backend validate required title/category/price/stock/slug basics.
- Backend rejects duplicate slug and duplicate SKU.
- Backend creates a `ProductImage` and `Stock` row.
- If no image is provided, a placeholder image is created.

Gaps:

- Brand cannot be selected during create.
- Specs are not editable as structured fields.
- Documents are not managed.
- Variants/типоразмеры are not managed.
- SEO fields are not managed.
- No draft review workflow beyond `isActive`.
- `descriptionRu` is stored inside `Product.specs.descriptionRu`, which mixes content with specs JSON.
- Form allows creating a product that is commercially incomplete, as long as minimal technical fields pass.

Severity:

- High for Admin Products v2.

## 11. Upload Flow Audit

What is good:

- Admin upload endpoint: `POST /api/admin/products/images`.
- Endpoint is protected by `AdminAuthGuard`.
- Frontend sends file through `FormData`.
- Client does not force JSON `Content-Type` for `FormData`.
- Backend allows JPG, PNG, WEBP, GIF and limits file size to 5 MB.
- Backend generates server-side filenames and stores files under `uploads/products`.
- Backend serves static `/uploads/...`.
- Create form receives URL, fills image URL input, sets alt fallback, and displays preview.
- QA verified upload/static serving/preview/product persistence/product page rendering.

Risks:

- Local disk upload storage is not production-safe unless hosting has persistent disk/volume.
- No object storage/S3 integration yet.
- No image manager for replace/delete/reorder.
- No image dimension/content scan beyond MIME and size.
- Disk fill/cleanup policy is not implemented.

Severity:

- High before relying on production uploads daily; already documented in Stage 39.

## 12. Product Page Connection Audit

What is good:

- Admin-created product appears in public API.
- Admin-created product appears in storefront category/search while active.
- Product page renders uploaded image without broken image errors.
- Price/stock edits from admin update storefront API.
- Inactive product is hidden from public product detail/search API.
- Customer QA passed across storefront routes/viewports/locales.

Gaps:

- Since product documents/specs are not structured in admin, public product page quality depends heavily on seeded/static data or manual DB structure.
- Existing product image edits are not available from product detail, only initial create flow has upload.

Severity:

- Medium/High for catalog quality at scale.

## 13. Security And Data Risks

High/Medium risks to address before broad admin usage:

- Role-based permissions are not enforced.
- Login has no rate limiting.
- Upload storage needs persistent/object storage strategy.
- Product create/edit lacks content quality workflow and draft/review state beyond active flag.
- No admin audit log for product changes beyond order status history.

Lower risks:

- Session token is tab-scoped through `sessionStorage`, which is reasonable for local/internal use but not a full session-management model.
- Tables on mobile work technically, but are not optimized for heavy mobile operations.

## 14. Recommended Admin Products v2 Scope

Recommended next work should focus on product management, not unrelated features:

1. Edit existing product identity: title KG/RU, slug, SKU, category, brand.
2. Edit descriptions and SEO fields.
3. Structured specs editor instead of ad-hoc JSON/content mixing.
4. Product documents model and admin UI.
5. Gallery manager: upload, reorder, replace, remove, alt text.
6. Variants/типоразмеры model and UI.
7. Product quality indicators in list: missing image, missing description, missing specs/docs.
8. Role/permission checks before adding destructive or bulk actions.
9. Persistent/object storage decision for uploads.

## 15. Remaining Blockers

For production:

- Backend hosting/server still not created.
- Production PostgreSQL still not created.
- `api.stroyrayon.kg` DNS target is still unknown until backend hosting exists.
- Production upload storage decision remains pending.

For Admin Products v2:

- Product edit surface is intentionally incomplete.
- Documents/specs/variants are not structured enough for professional catalog management.
- Roles exist in schema but are not enforced in admin endpoints.
- No audit log for product changes.

## 16. Stage 40A Conclusion

Admin/CRM is stable enough to proceed to Admin Products v2 planning and implementation.

Current CRM is operational for:

- login/logout;
- viewing orders;
- updating order status and notes;
- viewing products;
- creating products;
- uploading product image during create;
- updating product price, stock, active state, and admin note.

It is not yet a complete product management back office. The next stage should focus on structured product editing, documents/specs/images/variants, role enforcement, and production-safe upload storage.
