# Stage 17 — Full Internet Store Launch Audit

## 1. Date

Audit date: **2026-06-18**

Audit target: launch StroyRayon as a full internet store rather than a WhatsApp-only catalog.

## 2. Last commits checked

- `b6a3fe88376922d6f62e3f0ab5ed2302b4608a23` — Stage 16C: Add priority product WebP images batch 1
- `cc220b086a30adcf309c671097f2117f3d5b84ed` — Stage 16B: Audit product images and clean suspicious packshots
- `8c6e660` — Stage 16A: Fix KG RU localization leakage
- `ba39663` — Stage 15: Add global content audit report
- `d00d45d` — Stage 14C: Complete construction materials content

`main` and `origin/main` both pointed to Stage 16C at the start of the audit.

Working-tree baseline:

- Old content-audit, product-image checklist, visual-audit report and screenshot changes were already present.
- Old roadmap and audit folders were also untracked.
- None of those files were staged.
- Stage 17 does not modify, stage or include those artifacts.

## 3. Current project stage

The project has a strong storefront and a usable backend foundation, but it is not ready to launch as a fully operated internet store.

Current strengths:

- 179 frontend products with deep commercial content.
- KG/RU leakage, required-field and related-product audits are clean.
- Home, catalog hierarchy, product pages, search, cart, checkout and legal/information pages exist.
- Cart quantity update/removal and local persistence exist.
- Checkout can call a NestJS order API when explicitly enabled.
- PostgreSQL/Prisma models exist for catalog, products, brands, stock, customers, orders, order items and admin users.
- Order items store name, SKU and price snapshots.
- A frontend fallback keeps the catalog usable when the API is unavailable.

Current operating mode:

- Root `.env.example` sets `VITE_USE_API=false`.
- Without a production override, catalog data remains static and checkout opens WhatsApp without creating an order in PostgreSQL.
- There is no admin application, admin API or authenticated management workflow.

Overall readiness:

| Area | Result |
|---|---|
| Frontend storefront | **Partial / near-ready** |
| Backend public API | **Partial** |
| PostgreSQL/Prisma foundation | **Partial** |
| Checkout → stored order | **Partial, disabled by default** |
| Admin/CRM | **Missing** |
| Product/price/stock management | **Missing operational workflow** |
| Security | **Partial, not launch-ready** |
| Production deploy/domain | **Missing** |
| Full internet-store launch | **Blocked** |

## 4. Frontend readiness

### Ready

- Routes exist for:
  - Home `/`
  - Catalog root `/catalog`
  - Category/subcategory hierarchy `/catalog/*`
  - Product `/product/:productSlug`
  - Cart `/cart`
  - Checkout `/checkout`
  - Search `/search`
  - Contacts `/contacts`
  - Delivery `/delivery`
  - Payment `/payment`
  - Return `/return`
  - Privacy `/privacy`
  - About `/about`
- Production preview returned HTTP 200 with the React root for every route above.
- KG/RU switching persists through `localStorage` and updates `<html lang>`.
- Product cards, product information and the sticky CTA can add purchasable items to the cart.
- Cart supports increase, decrease, removal and local persistence.
- Checkout requires name, phone and address/region before submission.
- WhatsApp inquiry and checkout fallback links exist.
- Price/stock disclaimer text is visible in product/cart/checkout flows.
- Product and cart images have fallback handling.
- Page title, description, Open Graph, Twitter, canonical and product structured-data utilities exist.
- `robots.txt` points to `https://stroyrayon.kg/sitemap.xml`.
- Generated sitemap contains **343 URLs** with zero generator warnings.
- `vercel.json` provides SPA rewrites.
- Build, lint and catalog validation pass.

### Partial

- Checkout validation checks only non-empty strings. Phone format, length and normalization are not enforced.
- Client-side SEO is applied after JavaScript execution. There is no SSR/static prerender verification for social/search crawlers.
- Canonical fallback uses `window.location.href`; explicit canonical helpers are used on major SEO pages, but not consistently on cart/checkout/search.
- No automated interaction tests cover add-to-cart, quantity changes, locale switching or checkout submission.
- Mobile layout has extensive prior screenshots, but Stage 17 intentionally did not regenerate or change old visual-audit artifacts.
- The production JavaScript bundle is about **1.94 MB minified / 418.59 kB gzip** and triggers the existing large-chunk warning.

### Frontend conclusion

The storefront can launch as a catalog/lead-generation site. It cannot by itself guarantee that a submitted checkout becomes a managed store order.

## 5. Backend/API readiness

Stack:

- NestJS 10
- TypeScript
- PostgreSQL 16 local Docker definition
- Prisma ORM 6
- `class-validator` / `class-transformer`

Location: `api/`

Available NestJS modules:

| Module | Present | Operational scope |
|---|---:|---|
| Health | Yes | `GET /api/health` |
| Catalog | Yes | tree and node reads |
| Products | Yes | list/filter and slug reads |
| Brands | Yes | list reads |
| Stock | Partial | service only; no controller/admin endpoint |
| Orders | Partial | public create only |
| Customers | Partial | service only; no controller/admin endpoint |
| Admin users/auth | No application module | Prisma table only |

Verified public endpoints:

- `GET /api/health`
- `GET /api/catalog/tree`
- `GET /api/catalog/node`
- `GET /api/products`
- `GET /api/products/:slug`
- `GET /api/brands`
- `POST /api/orders`

Runtime smoke result:

- API started successfully from the built build.
- Health returned `status: ok`, `database: ok`.
- Catalog returned 8 root nodes.
- Products endpoint returned data and reported 54 products in the current local DB.
- Empty order payload was correctly rejected with HTTP 400.

Missing backend capabilities:

- No order list/detail/status-update endpoints.
- No product create/update/deactivate endpoints.
- No price or stock management endpoints.
- No customer management endpoints.
- No image upload endpoint.
- No admin authentication/authorization module.
- No automated test script.
- No backend production deployment configuration in the repository.

Backend readiness: **partial**.

## 6. Database readiness

### Ready

- PostgreSQL is the configured database.
- Prisma schema validates successfully.
- One initial migration exists and local migration status is up to date.
- Models exist for:
  - catalog nodes;
  - brands;
  - products;
  - product images and relations;
  - stock;
  - customers;
  - orders and order items;
  - admin users;
  - blog posts.
- Order item snapshots protect historical name, SKU, unit price, quantity and total.
- The seed script is designed to import frontend catalog/products, create stock records and synchronize relations.

### Partial

- The local database currently reports **54 products**, while the frontend catalog contains **179**.
- Therefore the currently running DB is stale or incompletely seeded.
- Seeded stock quantities are synthetic development values derived from stock status, not warehouse truth.
- The seed is a one-way import from frontend source data; there is no production source-of-truth policy or conflict-handling workflow.
- The Prisma product model and seed primarily persist KG commercial fields. The frontend contains richer KG/RU data, so API mode can lose some RU/deep-content fidelity unless the DB model/mapping is extended.
- There is no verified production database, backup/restore policy, migration release procedure or rollback plan.

### Missing

- Production PostgreSQL instance and connection plan.
- Verified 179-product production seed/import.
- Real stock initialization and reconciliation.
- Backups, monitoring and restore drill.

Database readiness: **partial**.

## 7. Checkout/order pipeline readiness

### Current behavior

- With `VITE_USE_API=false`, checkout only builds a WhatsApp message and opens WhatsApp.
- With `VITE_USE_API=true`, frontend posts to `${VITE_API_BASE_URL}/orders`.
- On API success, the response order number and WhatsApp URL are shown.
- On API failure, checkout falls back to the local WhatsApp URL.

### Data persisted by API

- Customer: name, phone, region/address.
- Order: number, status, subtotal, delivery price, total, currency, source, comment and WhatsApp text.
- Items: optional product link plus title/SKU/price/quantity/total snapshots.

### Validation

- Frontend requires non-empty name, phone and address.
- Backend uses global whitelist/transform/forbid-non-whitelisted validation.
- Backend requires customer, at least one item, non-negative price and positive quantity.

### Critical gaps

- API mode is disabled in the checked default environment.
- The server trusts the client-submitted item price and title instead of recalculating from authoritative product/variant data.
- Checkout does not reject inactive, missing or out-of-stock products.
- Stock is neither checked nor reserved when an order is created.
- `StockService.reserveProduct` is only a skeleton and is not called by the order flow.
- Cart prices can become stale because cart data is stored in browser `localStorage`.
- Order number generation uses yearly order count + 1; concurrent requests can produce a unique-key collision.
- API errors intentionally fall back to WhatsApp, so an order may look submitted to the customer while no database order exists.
- A successful local order write was not executed during the audit to avoid adding a fake order to the existing DB. Build, DB connectivity, endpoint registration, DTO rejection and transaction code were verified.

Checkout/order pipeline readiness: **partial** and **blocked for authoritative e-commerce use**.

## 8. Admin/CRM readiness

### Present

- Prisma includes `AdminUser` with OWNER/MANAGER/CONTENT roles.
- Prisma includes customers, orders and order statuses.

### Missing

- No `/admin` frontend route or separate admin app.
- No login page.
- No auth controller/service.
- No password hashing implementation.
- No JWT or session handling.
- No route guards or permission enforcement.
- No admin user seed/creation workflow.
- No orders list.
- No order detail.
- No order status update.
- No customer page/history.
- No manager notes.
- No product list/editor.
- No price or stock editor.
- No active/inactive controls.
- No product creation workflow.
- No image upload/admin image field.
- No admin audit log.

Admin/CRM readiness: **missing**.

This is the largest operational blocker. Even if orders are stored, staff cannot securely view or process them through the application.

## 9. Product/price/stock management readiness

Current source:

- Frontend price and stock status come from `src/data/products.js` when API mode is off.
- API mode reads price/status/stock from PostgreSQL.
- The local DB is populated through a developer seed script.

Operational gaps:

- Price/stock cannot be edited without code, Prisma Studio or direct database access.
- No protected product write APIs exist.
- No admin product workflow exists.
- No reliable real-stock ingestion exists.
- Checkout does not use stock quantity.
- API order creation accepts client price rather than authoritative DB price.

MVP requirement status:

| Requirement | Status |
|---|---|
| Admin product list | Missing |
| Edit price | Missing |
| Edit stock/status | Missing |
| Active/inactive | Schema only |
| Add product | Seed/code only |
| Order item snapshot | Ready |

Product/price/stock management readiness: **missing operational workflow**.

## 10. Security readiness

### Present

- `.env` and `api/.env` are ignored by Git.
- CORS origins are environment-configurable.
- DTO whitelist validation rejects unknown fields.
- Prisma uses parameterized database access.

### Missing or unsafe

- No admin authentication or authorization implementation.
- No password hashing implementation despite `AdminUser.passwordHash`.
- No JWT/session/token rotation.
- No role guards.
- No rate limiting or checkout spam protection.
- No CAPTCHA/bot mitigation.
- Public order endpoint accepts client-controlled price, title and SKU.
- Phone/customer fields have no strict format or length constraints.
- No request body size policy is configured explicitly.
- No security headers/Helmet configuration was found.
- No application-level audit logging.
- No centralized production exception/logging/alerting setup.
- Health returns HTTP success with `status: ok` even when its payload says `database: error`, which can mislead deployment health checks.

Security readiness: **partial, not production-ready**.

## 11. Production deploy readiness

### Frontend

Present:

- Vite production build works.
- Vercel SPA rewrite exists.
- Canonical target is `https://stroyrayon.kg`.
- robots and sitemap use the target domain.

Missing:

- No checked production Vercel environment values for `VITE_USE_API`, `VITE_API_BASE_URL` and optional timeout.
- No verified Vercel project/domain deployment from repository evidence.
- No bundle/code-splitting resolution for the large main bundle.

### Backend

Missing:

- Hosting target and deploy manifest.
- Production API URL.
- Production `DATABASE_URL`.
- Production CORS value including the final canonical frontend origin.
- Automated migration release command.
- Production seed/import procedure.
- Health-check integration, logs, monitoring and alerting.
- Backup/restore plan.

### Domain

Live check on 2026-06-18:

- `stroyrayon.kg` did not resolve in DNS.
- `www.stroyrayon.kg` did not resolve in DNS.
- HTTPS, www/non-www redirects, live robots and live sitemap therefore could not be verified.

Production deploy readiness: **missing**.

## 12. Analytics/SEO readiness

### SEO present

- Target canonical domain configured.
- Page metadata utilities.
- Product and breadcrumb structured data.
- Robots and 343-URL sitemap.
- KG/RU page content and language switch.

### SEO/analytics gaps

- No `hreflang` implementation for KG/RU alternatives.
- No verified production crawl because the domain does not resolve.
- No Google Search Console verification evidence.
- No Google Analytics/GTM implementation.
- No conversion events for:
  - add to cart;
  - checkout submit;
  - API order success/fallback;
  - WhatsApp click;
  - phone click.
- No consent/cookie analytics workflow if non-essential tracking is added.

Analytics/SEO readiness: **SEO partial, analytics missing**.

## 13. Launch blockers

### BLOCKER 1 — Admin/CRM is absent

There is no secure interface or API to log in, view orders, inspect customers or change order status.

### BLOCKER 2 — Product/price/stock management is absent

Staff cannot manage products, price, real stock or active status without code/database tooling.

### BLOCKER 3 — Stored checkout is disabled by default and has no production API deployment

`VITE_USE_API=false` means the checked configuration remains WhatsApp-only. No production backend URL/hosting is defined.

### BLOCKER 4 — Database/catalog synchronization is incomplete

The verified local API DB has 54 products versus 179 frontend products. A full, repeatable production import has not been proven.

### BLOCKER 5 — Order totals and stock are not authoritative

The API trusts client-submitted prices and does not check/reserve stock. A customer can submit stale or modified price data.

### BLOCKER 6 — Production security controls are incomplete

Admin auth does not exist; public order creation has no rate limiting/spam protection; validation is too weak for customer identity fields.

### BLOCKER 7 — Domain and production infrastructure are not live

`stroyrayon.kg`/`www.stroyrayon.kg` do not resolve. Frontend, API, DB, HTTPS, redirects and monitoring are not deployed as one production system.

Main blocker count: **7**.

## 14. Before-launch tasks

### BLOCKER work

1. Build a minimal protected admin/CRM:
   - login;
   - roles/guards;
   - orders list/detail/status;
   - customer details;
   - product list;
   - price, stock and active-status editing.
2. Make backend product/stock data authoritative.
3. Recalculate order item name, price and availability on the server.
4. Add transactional stock validation/reservation policy.
5. Import and verify all 179 products in a clean production-like DB.
6. Deploy API and PostgreSQL with migrations, backups and health monitoring.
7. Set production frontend env:
   - `VITE_USE_API=true`;
   - `VITE_API_BASE_URL=https://<production-api>/api`.
8. Implement admin auth, password hashing, JWT/session, role guards and rate limiting.
9. Configure DNS, HTTPS and canonical www/non-www redirects.

### BEFORE LAUNCH

- Add normalized phone validation and field length limits.
- Add order concurrency-safe numbering.
- Distinguish “saved order” from “WhatsApp-only fallback” clearly in the checkout UI.
- Add automated API/order tests and critical frontend interaction tests.
- Add real product/stock reconciliation procedure.
- Configure production logs and alerts.
- Verify privacy text against the actual data processor/hosting/analytics setup.
- Verify payment, delivery, return and legal business details with the store owner.
- Add Search Console and conversion analytics.
- Complete or explicitly accept the remaining 60 Priority 1 photo placeholders as a catalog-quality risk.

## 15. After-launch tasks

### AFTER LAUNCH

- Advanced CRM notes, assignments and activity history.
- Promotions/coupons.
- Online payment gateway.
- Customer account/order tracking.
- Multi-warehouse stock.
- Rich image upload/transformation pipeline.
- Advanced analytics dashboards.
- SSR/prerender migration if crawler/social preview evidence requires it.
- Bundle splitting and performance optimization beyond launch thresholds.
- Expanded audit logging and business intelligence.

## 16. Recommended next stages

Estimated stages before full internet-store launch: **5 focused stages**.

1. **Stage 18 — Authoritative Order and Stock Core**
   - server-side price lookup;
   - active/stock validation;
   - safe order numbering;
   - stock reservation policy;
   - automated order tests.
2. **Stage 19 — Admin Auth and CRM MVP**
   - secure admin login;
   - roles;
   - orders/customers/status management.
3. **Stage 20 — Product/Price/Stock Admin**
   - product list/edit;
   - price/stock/active state;
   - safe image field workflow.
4. **Stage 21 — Production Data and Deployment**
   - clean DB;
   - 179-product import verification;
   - API/DB hosting;
   - migrations/backups/logs;
   - frontend API env.
5. **Stage 22 — Domain, Security and Launch Verification**
   - DNS/HTTPS/redirects;
   - rate limiting/security headers;
   - end-to-end checkout;
   - analytics/Search Console;
   - launch smoke and rollback checklist.

Photo Batch 2 should remain separate from these architecture/operations stages.

## 17. Commands run and results

### Git

- `git status` — completed; old dirty report/screenshot artifacts recorded and unstaged.
- `git log --oneline -5` — completed; Stage 16C confirmed at `b6a3fe8`.
- `git rev-parse HEAD` / `git rev-parse origin/main` — matched at audit start.

### Frontend

- `npm.cmd run validate:catalog` — **passed**, 0 warnings.
- `npm.cmd run generate:sitemap` — **passed**, 343 URLs, 0 warnings.
- `npm.cmd run lint` — **passed**.
- `npm.cmd run build` — **passed**; non-blocking large-chunk warning remains.
- `git diff --check` — **passed**.
- Vite production preview route smoke — **passed**, HTTP 200 for all required routes.

### Backend

- `npm.cmd run build` — **passed**.
- `npm.cmd run lint` — **passed**.
- `npm.cmd run prisma:validate` — **passed**.
- `npx.cmd prisma migrate status` — **passed**, 1 migration found, local DB up to date.
- `npm run test` — **not available**, no test script.
- Runtime API health — **passed**, API and database reported `ok`.
- Runtime catalog/products reads — **passed**.
- Invalid order validation smoke — **passed**, HTTP 400.
- Successful test order creation — **not run** to avoid inserting a fake order into the existing local DB.

### Production/domain

- `https://stroyrayon.kg/` — DNS name did not resolve.
- `https://www.stroyrayon.kg/` — DNS name did not resolve.
- Live robots/sitemap/HTTPS/redirect verification — unavailable until DNS is configured.
