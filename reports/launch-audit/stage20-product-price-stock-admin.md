# Stage 20 — Product / Price / Stock Admin MVP

Date: 2026-06-19

## Baseline

- Stage 19 commit: `3d2d262f65e95c5040ffbb9f7a04cfe8e546232b`.
- Local `main` and `origin/main` matched before Stage 20.
- Existing visual reports, screenshots, photo batches and unrelated audit files remain outside
  the Stage 20 change set.

## Admin routes

- `/admin/products`
- `/admin/products/:id`

Both routes use the Stage 19 protected admin router branch and `AdminLayout`. Public Header,
Footer, mobile navigation, catalog layout and storefront components were not changed.
Unauthenticated access redirects to `/admin/login`; HTTP 401 clears the session token.

## Protected product API

```text
GET   /api/admin/products
GET   /api/admin/products/:id
PATCH /api/admin/products/:id/price
PATCH /api/admin/products/:id/stock
PATCH /api/admin/products/:id/active
PATCH /api/admin/products/:id/note
```

Every endpoint uses the shared Stage 19 `AdminAuthGuard`. No public mutation endpoint exists.

The list supports title/slug/SKU search plus category, stock status and active-state filters.
Rows expose category path, brand, price, unit, physical/reserved/available stock, active state,
image readiness and update time.

## Editable fields

- authoritative database price;
- physical stock quantity;
- `IN_STOCK`, `LOW_STOCK`, `PRE_ORDER`, or `OUT_OF_STOCK` status;
- active/inactive storefront visibility;
- private product admin note.

Intentionally read-only in Stage 20:

- title and localization fields;
- slug and SKU;
- catalog/category tree;
- descriptions, specs, SEO and FAQ;
- tags/badges;
- product images and upload.

## Price behavior

- Price validation requires a positive value, maximum two decimal places and database range.
- New orders read the updated database price through the existing authoritative Stage 18 flow.
- Existing `OrderItem.unitPriceSnapshot` and totals are never recalculated.
- Runtime smoke changed a product price, confirmed public product API output, created an order,
  and verified both order unit price and total used the new value.

## Stock behavior

- Quantity must be a nonnegative integer.
- Quantity cannot be reduced below existing `reservedQuantity`.
- Quantity and stock status are updated transactionally.
- Setting quantity to zero without an explicit status safely selects `OUT_OF_STOCK`.
- Existing Stage 18 reservation checks and atomic reservation behavior remain in place.
- Negative stock returned HTTP 400 in runtime smoke.
- The smoke order was cancelled through CRM, releasing its reservation before original product
  values were restored.

## Active/inactive behavior

- Public product lists already filter to active products.
- Public product detail now also requires `isActive: true`.
- Order creation rejects inactive products even when a client submits a known product ID/slug.
- Runtime smoke confirmed inactive order creation returns HTTP 400.

## Storefront/API mode

- Public product detail returned the updated price and stock status.
- Public order creation used the updated database price and stock.
- Frontend build passes with default configuration and with `VITE_USE_API=true`.
- Public storefront route definitions and public layout components have no Stage 20 changes.
- Exact visual stock messaging remains tied to the current storefront mapping; richer unavailable
  and low-stock UX can be refined in Stage 21/22 without changing the safety guarantees.

## Audit/history

`Product.updatedAt` changes on price, status and active-state updates. A general product field-level
audit event table was intentionally deferred to avoid expanding Stage 20 into a full PIM/audit
platform. This remains a before-launch improvement if operational policy requires it.

## Tests

Backend suite: 27 passing tests total.

Stage 20 added 11 tests covering:

- unauthenticated product list rejection;
- unauthenticated price update rejection;
- authenticated list mapping;
- authenticated detail;
- valid price update;
- invalid price rejection;
- stock quantity/status update;
- negative/below-reservation stock rejection;
- active/inactive update;
- new order calculation after price change while old snapshot stays unchanged;
- inactive products excluded from public product detail.

The 16 Stage 19 and earlier tests remain green.

## Runtime smoke

Passed:

- admin login;
- product list without auth: HTTP 401;
- authorized product list/detail;
- price update;
- stock quantity/status update;
- negative stock: HTTP 400;
- public product API reflected new price/status;
- order used new authoritative price;
- order cancellation released reservation;
- inactive update;
- inactive order creation: HTTP 400;
- original product price, quantity, status and active state restored after smoke.

## Commands

Passed:

- frontend `npm.cmd run validate:catalog`;
- frontend `npm.cmd run generate:sitemap`;
- frontend `npm.cmd run lint`;
- frontend `npm.cmd run build`;
- frontend API-mode build with `VITE_USE_API=true`;
- `git diff --check`;
- backend `npm run lint`;
- backend `npm run build`;
- backend `npm run test`;
- `npx prisma validate`;
- `npx prisma migrate status`.

The existing frontend large-chunk warning remains non-blocking.

## Migration

- `20260619120000_product_admin_note`

The migration adds the optional private `Product.adminNote` field and was applied successfully.

## Remaining blockers for Stage 21/22

- Production environment/hosting and secret provisioning.
- Product change audit events and more granular admin permissions.
- Bulk editing/import and operational inventory reconciliation.
- Image upload and media lifecycle.
- Final production API-mode rollout, caching and end-to-end browser automation.
- Richer storefront stock/unavailable messaging and payment/fulfillment integration.
