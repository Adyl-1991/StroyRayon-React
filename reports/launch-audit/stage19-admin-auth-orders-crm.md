# Stage 19 — Admin Auth + Orders CRM MVP

Date: 2026-06-19

## Baseline

- Stage 18 commit: `ff890ddb2af7b2233bb8d82c711b7477d94c8b76`.
- Stage 18 was present on both local `main` and `origin/main` before Stage 19.
- Pre-existing visual audits, screenshots, photo work and unrelated reports were left untouched
  and are excluded from the Stage 19 commit.

## Admin authentication

- Email/password login with salted Node.js `scrypt` password hashes.
- Signed HS256 Bearer JWT with expiry controlled by environment variables.
- Required 32+ character `ADMIN_JWT_SECRET`; no production secret is stored in the repository.
- Protected current-admin profile and logout endpoints.
- Shared Nest guard protects every admin orders controller route.
- Disabled admins cannot log in or load their profile.
- First `OWNER`/admin can be bootstrapped by the Prisma seed using environment variables.
- Frontend token is kept in `sessionStorage`, attached only to admin API requests and cleared on
  logout or any HTTP 401 response.

## Backend CRM endpoints

```text
POST  /api/admin/auth/login
GET   /api/admin/auth/me
POST  /api/admin/auth/logout
GET   /api/admin/orders
GET   /api/admin/orders/:id
PATCH /api/admin/orders/:id/status
PATCH /api/admin/orders/:id/note
```

The public `POST /api/orders` remains the existing authoritative Stage 18 order creation flow.
No public order list, order detail, status mutation or admin note endpoint was added.

## Admin frontend

Routes:

- `/admin/login`
- `/admin` (redirects to `/admin/orders` after auth)
- `/admin/orders`
- `/admin/orders/:id`

Admin routes use a separate router branch and separate `AdminLayout`. They do not render the
public `Header`, `Footer`, mobile navigation or storefront layout. Public routes continue to
use the unchanged public `App` layout.

The UI includes login errors and loading state, auth redirects, logout, order loading/error/empty
states, status filters, list/detail views, item price snapshots, totals, reservation state,
validated next-status selection, private note save/clear and chronological status history.
No demo orders or duplicate frontend order store were introduced.

## Order workflow and inventory

Supported statuses:

```text
NEW
PENDING_CONFIRMATION
CONFIRMED
ASSEMBLING
DELIVERED
CANCELLED
```

Only explicit forward transitions are allowed. `DELIVERED` and `CANCELLED` are terminal.
Every change records the previous status, next status, admin and timestamp.

- Cancellation atomically decrements `Stock.reservedQuantity` and clears item reservations.
- Delivery atomically decrements both physical quantity and reserved quantity, then clears item
  reservations.
- Guarded updates prevent negative or stale inventory mutations.
- A reconciliation migration advances yearly `OrderSequence` values to existing historical order
  numbers before new orders are created.

## Database migrations

- `20260618190000_admin_auth_orders_crm`
- `20260618191000_reconcile_order_sequence`

Both migrations were applied successfully to the local Stage 19 database.

## Tests and smoke

Backend suite: 16 passing tests total (9 Stage 19 tests plus 7 existing Stage 18 tests).

Stage 19 tests cover login success, wrong password, unauthenticated list/detail/status rejection,
valid token acceptance, authenticated list mapping, status/history update, and admin note
save/clear.

Runtime smoke passed against the built Nest API and local PostgreSQL:

- orders list without auth: HTTP 401;
- wrong login: HTTP 401;
- correct login: passed;
- authorized list and detail: passed;
- authorized status and note updates: passed;
- status update without auth: HTTP 401;
- public order creation remained operational and produced `SR-2026-000003`.

Frontend router/build verification confirms that admin routes live outside the public layout,
unauthenticated `/admin/orders` redirects to `/admin/login`, and public routes remain under the
unchanged storefront `App` shell.

## Commands

Passed:

- frontend `npm.cmd run validate:catalog`;
- frontend `npm.cmd run generate:sitemap`;
- frontend `npm.cmd run lint`;
- frontend `npm.cmd run build`;
- `git diff --check`;
- backend `npm run lint`;
- backend `npm run build`;
- backend `npm run test`;
- `npx prisma validate`;
- `npx prisma migrate status` (6 migrations, database up to date).

The frontend build retains the existing large-chunk warning; it is not a Stage 19 functional
failure.

## Remaining blockers for Stage 20

- Production deployment still needs real environment secrets and the first production admin seed.
- JWT logout is client-side/stateless; token revocation and refresh-token rotation are future work.
- No password reset, 2FA, login throttling or advanced audit trail yet.
- Payment status does not exist in the current order schema, so the CRM returns no payment state.
- No UI pagination controls beyond the API page/limit contract.
- No customer communication, fulfillment assignment or analytics workflow.

## Intentionally excluded

- Product editor and image upload.
- Photo batch work and new products.
- Storefront redesign.
- Advanced analytics and fine-grained permissions.
- Visual audit screenshots, old dirty reports and unrelated roadmap files.
