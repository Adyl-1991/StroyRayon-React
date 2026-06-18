# Stage 18 — Authoritative Order and Stock Core

Date: 2026-06-18

## Result

Stage 18 closes the launch-audit blocker where checkout trusted client prices and created orders
without authoritative availability handling.

Implemented:

- Product title, SKU, slug, unit and price are loaded from PostgreSQL.
- Client price/title/SKU/unit values are compatibility hints and do not affect totals.
- Missing, mismatched, inactive and out-of-stock products are rejected.
- Pre-order, missing-stock and insufficient-stock items are stored with `needs_confirmation`.
- Confirmed quantities are reserved atomically inside the same Prisma transaction as the order.
- Duplicate cart lines for one product are checked and reserved as one combined quantity.
- Concurrent stock changes cannot over-reserve; the affected item falls back to confirmation.
- Order items store slug, unit, stock-check status and reserved-quantity snapshots.
- Orders expose `availabilityCheckRequired`.
- Yearly order numbers use an atomic `OrderSequence` row instead of `order.count() + 1`.
- Quantities must be positive integers.
- Currency line totals are rounded to two decimal places.
- Seed synchronization persists RU/EN titles, removes stale products and preserves real stock
  quantities on update.

## Database migrations

- `20260618090000_trusted_order_pricing`
- `20260618170000_order_reservations_and_sequence`
- `20260618171500_drop_order_snapshot_backfill_defaults`

The final migration removes temporary defaults that existed only to backfill old order rows.

## Verification

- `npm test` — passed, 7 tests.
- `npm run build` — passed.
- `npm run lint` — passed.
- `npm run prisma:validate` — passed.
- `npx prisma migrate status` — 4 migrations found, database up to date.
- Prisma database-to-schema diff — empty.
- `git diff --check` — passed.

## Reservation policy

- `IN_STOCK`/`LOW_STOCK` with enough available quantity: reserve and return `ok`.
- `PRE_ORDER`, no stock row, or insufficient quantity: create order with `needs_confirmation`.
- `OUT_OF_STOCK` or inactive product: reject the order.
- Concurrent stock mutation: do not reserve stale data; create the item as `needs_confirmation`.

Reservation release on cancellation and stock deduction on fulfillment belong to the order-status
lifecycle/Admin CRM stage.
