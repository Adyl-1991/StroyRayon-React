# Stage 28 — Storefront QA + Visible Bugfix Pass

Date: 2026-06-20

Baseline commit: `046fb37d6561096f8707ea5c27eff7b75c26b745`

## Summary

The public storefront and separated admin entry points were checked in a production Vite build at 360, 390, 430, 768, 1024, and 1440 pixel widths. The automated browser matrix covered 17 routes and 102 route/viewport combinations, plus a static buyer flow.

One visible storefront issue was reproduced and fixed: the long WhatsApp action on `/delivery` overflowed the viewport by 19 pixels at 360 px. No redesign, catalog data, product images, backend behavior, or public navigation structure was changed.

Final local browser result:

- 102/102 route/viewport checks passed.
- No horizontal overflow remained.
- No broken images were detected.
- No browser runtime or console errors were detected.
- No failed application network requests were detected.
- No requests to `localhost:4000` or `127.0.0.1:4000` occurred.
- Public Header/Footer remained present on storefront routes.
- Public Header/Footer remained absent from admin routes.
- Unauthenticated `/admin/orders` and `/admin/products` redirected to `/admin/login`.

## Routes checked

- `/`
- `/catalog`
- `/catalog/stroymaterial`
- `/catalog/inzhenerdik-santehnika/ppr-trubalar-fitingder`
- `/product/ppr-truba-pn20`
- `/cart`
- `/checkout`
- `/search?q=ппр`
- `/contacts`
- `/delivery`
- `/about`
- `/payment`
- `/return`
- `/privacy`
- `/admin/login`
- `/admin/orders`
- `/admin/products`

## Responsive coverage

- Mobile: 360, 390, 430 px
- Tablet: 768 px
- Desktop: 1024, 1440 px

Selected screenshots were reviewed manually for Home, Catalog, Product, Cart, Checkout, and Admin Login. They were written only under the operating-system temporary directory and are not part of the repository or commit.

## Visible issue fixed

### Delivery WhatsApp action overflow

Before the fix, `/delivery` at 360 px had a 19 px horizontal overflow. Browser element diagnostics identified:

`a.button.button--whatsapp [left=57, right=379]`

The mobile `.seo-text .button` rule now:

- stays within the content width;
- permits the label to wrap;
- keeps a usable touch height and vertical padding.

The targeted 360 px retest and the complete 102-check local matrix both passed after rebuilding.

## Buyer flow

Static storefront flow passed:

1. Product page opened.
2. A valid variant was selected.
3. Product was added to cart.
4. Cart contained one item.
5. Quantity changed from 1 to 2.
6. Checkout form and order summary rendered.
7. Price/availability confirmation disclaimer remained visible.

The production backend is still not deployed, so this stage intentionally did not claim a real production order submission or stock reservation.

## Live Vercel comparison

Checked: `https://stroy-rayon-react.vercel.app`

- The existing deployment rendered the storefront and static buyer flow.
- No actual localhost API request was observed in browser network traffic.
- The same `/delivery` 360 px overflow was present because the Stage 28 fix had not yet been deployed.
- One initial `/catalog` 360 px blank result did not reproduce in an immediate isolated retest and was classified as transient navigation/network noise, not a confirmed product defect.

After this Stage 28 commit is pushed and Vercel redeploys, the delivery overflow must be rechecked on the live alias.

## Admin separation

- `/admin/login` rendered without public Header/Footer.
- `/admin/orders` without a session redirected to `/admin/login`.
- `/admin/products` without a session redirected to `/admin/login`.
- Admin login visual layout remained usable at mobile width.

Authenticated production admin QA remains blocked until the production backend, database, secrets, and admin bootstrap are available.

## Console, network, images, and fallback

- Browser runtime exceptions: none in the final local matrix.
- Browser console errors: none in the final local matrix.
- Broken images: none detected.
- Failed application requests: none detected.
- Runtime localhost API requests: none detected.
- The live site remains in static/fallback storefront mode pending production backend connection.

## Commands run

- `git status --short`
- `git log -1 --oneline`
- `git diff --stat`
- `git diff --check`
- `npm.cmd install`
- `npm.cmd run dev -- --host 127.0.0.1 --port 4181`
- `npm.cmd run validate:catalog`
- `npm.cmd run generate:sitemap`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run preview -- --host 127.0.0.1 --port 4182`
- `node scripts/stage28-storefront-qa.mjs`
- targeted local and live Stage 28 browser runs
- backend checks listed below

## Files changed

- `src/styles/global.css` — mobile containment/wrapping for long informational CTA labels.
- `scripts/stage28-storefront-qa.mjs` — repeatable CDP storefront QA matrix and buyer smoke.
- `reports/stage28-storefront-qa-bugfix-pass.md` — this report.

## Final checks

- Catalog validation: passed, 179 products, zero warnings.
- Sitemap generation: passed, 343 URLs.
- Frontend lint: passed.
- Frontend production build: passed.
- Backend tests: passed, 29/29.
- Prisma schema validation: passed.
- `git diff --check`: passed for Stage 28 files.

The Vite build still reports the existing large JavaScript chunk warning. It does not fail the build and is not a visible launch blocker for this stage.

## Remaining blockers

1. Production PostgreSQL is not provisioned/connected.
2. Production backend service and public backend URL are not available.
3. Production backend environment values and admin bootstrap credentials are not configured.
4. Prisma migrations and the 179-product import have not been run against production.
5. Vercel API environment and final production Buyer/Admin E2E cannot be completed until the backend exists.

DNS/custom-domain work remains an owner deployment action after the production services are connected.

## Commit scope guard

Only the Stage 28 CSS fix, reusable QA script, and this report are intended for staging. Existing old visual reports, screenshots, photo artifacts, roadmap files, and unrelated working-tree changes must remain unstaged and uncommitted.
