# StroyRayon Frontend

StroyRayon storefront frontend.

## Local Development

```bash
npm install
npm run dev
```

By default the storefront uses local static catalog and product data, so it works without the backend.

## API Read Mode

Create `.env` from `.env.example` and enable API mode:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_USE_API=true
```

When API mode is enabled, catalog and product read data is requested from the backend. If the backend is unavailable, the storefront falls back to static data and remains usable.

Checkout also uses the backend when `VITE_USE_API=true`: the cart and customer form are posted to `POST /api/orders`, the API stores the order snapshot, returns an order number, and builds the WhatsApp text/URL. If the backend is unavailable, checkout falls back to the local WhatsApp flow so customers can still send the order.

## Checks

```bash
npm run lint
npm run build
```
