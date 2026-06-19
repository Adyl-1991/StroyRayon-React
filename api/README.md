# StroyRayon API

NestJS + PostgreSQL backend foundation for the StroyRayon e-commerce catalog.

## Stack

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- class-validator / class-transformer
- ConfigModule + dotenv

## Setup

```bash
cd api
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:validate
docker compose up -d
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

If `.env` does not exist, copy `.env.example` first. The local Docker database uses:

```env
DATABASE_URL="postgresql://stroyrayon:stroyrayon_password@localhost:5432/stroyrayon?schema=public"
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

## Local PostgreSQL

Start PostgreSQL with Docker Compose:

```bash
cd api
docker compose up -d
```

The compose file creates:

- container: `stroyrayon-postgres`
- database: `stroyrayon`
- user: `stroyrayon`
- password: `stroyrayon_password`
- port: `5432`

Then run Prisma:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Backend default port: `4000`.
Frontend dev server remains on `5173`.

## Environment

`.env.example` contains:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/stroyrayon?schema=public"
PORT=4000
CORS_ORIGIN="http://localhost:5173"
ADMIN_JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
ADMIN_JWT_EXPIRES_SECONDS=28800
ADMIN_INITIAL_EMAIL=owner@example.com
ADMIN_INITIAL_PASSWORD=replace-with-a-strong-password
ADMIN_INITIAL_NAME=StroyRayon Owner
ADMIN_INITIAL_ROLE=OWNER
```

`ADMIN_JWT_SECRET` is required at API startup and must contain at least 32 characters.
The initial password is read only by the seed process and stored as a salted `scrypt`
hash. Do not commit real credentials.

To bootstrap or update the first admin, set `ADMIN_INITIAL_EMAIL` and a password with
at least 12 characters, then run:

```bash
npm run prisma:seed
```

Existing admin passwords are not overwritten by later catalog seeds.

## API Prefix

All endpoints use the `/api` global prefix.

## Public Endpoints

```http
GET /api/health
GET /api/catalog/tree
GET /api/catalog/node?path=stroymaterialdar/kurgak-aralashmalar
GET /api/products
GET /api/products/:slug
GET /api/brands
POST /api/orders
```

## Protected Admin API

All CRM endpoints except login require:

```http
Authorization: Bearer <access-token>
```

```http
POST  /api/admin/auth/login
GET   /api/admin/auth/me
POST  /api/admin/auth/logout
GET   /api/admin/orders
GET   /api/admin/orders/:id
PATCH /api/admin/orders/:id/status
PATCH /api/admin/orders/:id/note
```

Order list accepts `status`, `page`, and `limit`. Supported statuses are `NEW`,
`PENDING_CONFIRMATION`, `CONFIRMED`, `ASSEMBLING`, `DELIVERED`, and `CANCELLED`.
Status transitions are validated and stored in `OrderStatusHistory`. Cancelling
releases reserved quantities atomically; delivering writes reserved quantities off
stock atomically. The internal `adminNote` is available only through this protected API.

## Product Query Parameters

`GET /api/products` accepts frontend-compatible query params:

- `q`
- `min`
- `max`
- `stock`
- `brand`
- `badge`
- `unit`
- `sort`
- `catalogPath`
- `page`
- `limit`

## Order Flow

`POST /api/orders` accepts customer data and cart items, then stores order item snapshots.

The API:

1. validates customer and item data;
2. finds or creates a customer by phone;
3. resolves every item to an active database product;
4. ignores client title, price, SKU and unit hints when calculating the order;
5. creates a concurrency-safe yearly order number;
6. reserves confirmed in-stock quantities inside the order transaction;
7. stores authoritative product, price, availability and reservation snapshots;
8. builds Kyrgyz WhatsApp order text;
9. returns authoritative totals, item results, WhatsApp text, and a WhatsApp URL.

`OUT_OF_STOCK` and inactive products are rejected. `PRE_ORDER`, missing stock rows,
insufficient quantities, or concurrent stock changes keep the order valid but mark
`availabilityCheckRequired: true`. Only items with `stockCheckStatus: "ok"` are reserved.

Example request:

```http
POST /api/orders
Content-Type: application/json
```

```json
{
  "customer": {
    "name": "Айбек",
    "phone": "+996700123456",
    "region": "Бишкек",
    "address": "7-кичи район"
  },
  "items": [
    {
      "productId": "optional-backend-id",
      "slug": "ppr-truba-pn20-20mm",
      "title": "PPR труба PN20 20мм",
      "sku": "PPR-20",
      "price": 120,
      "quantity": 3,
      "unit": "даана"
    }
  ],
  "comment": "Түштөн кийин байланышкыла",
  "source": "website"
}
```

Example response:

```json
{
  "orderId": "clx...",
  "orderNumber": "SR-2026-000001",
  "status": "new",
  "total": 360,
  "currency": "KGS",
  "availabilityCheckRequired": false,
  "items": [
    {
      "slug": "ppr-truba-pn20-20mm",
      "quantity": 3,
      "unitPrice": 120,
      "lineTotal": 360,
      "stockCheckStatus": "ok",
      "reservedQuantity": 3
    }
  ],
  "whatsappText": "Салам! StroyRayon сайтынан жаңы заказ...",
  "whatsappUrl": "https://wa.me/996700123456?text=..."
}
```

## Data Migration Strategy

Current frontend static data is imported by the local seed script:

1. `src/data/catalogTree.js` -> `CatalogNode` records.
2. `src/data/products.js` -> `Product`, `Brand`, `Stock`, `ProductImage`, and `ProductRelation` records.
3. `src/data/productAssets.js` -> product image path mapping through the frontend product factory.
4. `src/data/productSchema.js` remains the frontend validation reference for future admin/import tools.

Brands must stay in the `Brand` model only. They must not become `CatalogNode` records.

Seeded stock quantities are for local development only:

- `IN_STOCK` -> 25
- `LOW_STOCK` -> 5
- `PRE_ORDER` -> 0
- `OUT_OF_STOCK` -> 0
- warehouse: `Негизги склад`

## Local Seed Flow

```bash
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Quick checks:

```http
GET http://localhost:4000/api/health
GET http://localhost:4000/api/catalog/tree
GET http://localhost:4000/api/products
GET http://localhost:4000/api/brands
GET http://localhost:4000/api/products/ppr-truba-pn20-20mm
```

## Commands

```bash
npm run build
npm test
npm run lint
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run prisma:seed
npm run start:dev
```
