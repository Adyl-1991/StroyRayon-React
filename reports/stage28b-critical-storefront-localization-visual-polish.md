# Stage 28B — Critical Storefront Localization + Visual Polish Fix

Date: 2026-06-20

Baseline commit: `5e94f9dd952a2540b89e7a57e2d05751e227931e`

The task brief referenced `046fb37d6561096f8707ea5c27eff7b75c26b745`, but Stage 28 had already advanced and pushed `main` to `5e94f9d`. Stage 28B was implemented on the actual current `main`.

## Summary

The public Kyrgyz storefront was audited for mixed Russian/Kyrgyz interface copy, category naming inconsistencies, category-page spacing, cart presentation, responsive behavior, and admin layout separation.

Results:

- 50 direct Russian/mixed-language copy occurrences in KG-facing source were corrected.
- Four category title/chip consistency points were corrected.
- A runtime KG product-copy normalizer now protects legacy product descriptions, specifications, FAQ text, package text, SEO descriptions, and structured data from the recurring `заказ`/`наличие` leakage without changing the RU locale.
- Final browser QA passed 154/154 route/viewport combinations.
- No final KG leakage detector matches, horizontal overflow, broken images, console errors, or failed application requests were found.

## RU leakage found

The audit found recurring KG-interface leakage in:

- cart and checkout: `Заказ`, `Заказга өтүү`, `Комментарий`;
- public information pages: `заказ`, `Checkout`, `комментарий`;
- trust/delivery copy: `наличие`, `заказ`;
- product status and legacy KG product copy: `Заказ менен`, `наличие`, inflected variants;
- footer, homepage process text, SEO copy, blog copy, WhatsApp order text, and product notices;
- old category copy such as `Стройматериал` in a KG image alt value.

Legitimate RU-locale dictionary entries and Russian admin CRM copy were intentionally not counted as KG leakage and were not translated.

## RU leakage fixed

Core terminology now uses:

- `Буйрутма` instead of `Заказ`;
- `Буйрутма жыйынтыгы`;
- `Буйрутма берүүгө өтүү`;
- `Кошумча маалымат` instead of `Комментарий`;
- `бар-жогу` or `кампада` instead of `наличие`;
- `Буйрутма менен` instead of `Заказ менен`;
- `интернет-дүкөн` instead of `интернет-магазин`;
- `Буйрутма берүү барагы` instead of `Checkout барагы`.

The KG product-copy normalizer is applied only when the active locale is KG. RU product titles, descriptions, labels, and admin pages continue to use Russian.

## Category naming fixes

Public KG category titles and chips were aligned:

- `Курулуш материалдары`
- `Инженердик сантехника`
- `Сантехника`
- `Электрика`
- `Шаймандар`
- `Бекиткич`
- `Боёк, туш жана кагаз`
- `Вентиляция`

The paint category now uses the same title in the header chip, catalog card, page heading, and breadcrumb.

Compatibility aliases were added so these requested URLs resolve:

- `/catalog/kurulush`
- `/catalog/shaimandar`
- `/catalog/bekitkich`

Canonical existing catalog slugs remain intact, avoiding sitemap and storefront link breakage.

## Cart UI fixes

- Replaced the browser-default remove button appearance with a scoped `cart-item__remove` control.
- Added consistent hover, border, danger color, radius, and touch height.
- Aligned quantity control, line total, and remove action on desktop.
- Added mobile-specific positioning for quantity, total, and remove action.
- Added visual separators and consistent spacing to the summary card.
- Made the summary CTA full width.
- Removed the previous excessive mobile top margin before the cart summary CTA.
- Updated copy to `Буйрутма жыйынтыгы` and `Буйрутма берүүгө өтүү`.
- Updated checkout heading, breadcrumb, confirmation, preview heading, WhatsApp message, and CTA terminology.

Filled cart and checkout states were manually reviewed at mobile and desktop sizes.

## Category spacing fixes

- Added explicit breadcrumb-to-heading spacing.
- Increased heading-to-sections spacing.
- Increased spacing between subcategory cards and the product section to 36 px on desktop and 28 px on mobile.
- Increased internal section rhythm and normalized section heading margins.
- Increased separation before the consultation section.
- Hid the secondary materials-list CTA at common 1366/1440 layouts so the longer, consistent category chips have more usable horizontal space; the category strip remains scrollable when needed.

## Routes checked

- `/`
- `/catalog`
- `/catalog/kurulush`
- `/catalog/inzhenerdik-santehnika`
- `/catalog/santehnika`
- `/catalog/elektrika`
- `/catalog/shaimandar`
- `/catalog/bekitkich`
- `/catalog/boiok-tush-kagaz`
- `/catalog/ventilyaciya`
- `/cart`
- `/checkout`
- `/search`
- `/contacts`
- `/delivery`
- `/about`
- `/payment`
- `/return`
- `/privacy`
- `/admin/login`
- `/admin/orders`
- `/admin/products`

The automated matrix contains 22 route states across seven viewports: 154 checks.

## Viewports checked

- 360 px
- 390 px
- 430 px
- 768 px
- 1024 px
- 1366 px
- 1440 px

Selected category, mobile, desktop, filled-cart, filled-checkout, and admin-login screenshots were generated only in the operating-system temporary directory. They were not added to the repository.

## Admin separation

- `/admin/login` remained outside the public Header/Footer.
- Unauthenticated `/admin/orders` redirected to `/admin/login`.
- Unauthenticated `/admin/products` redirected to `/admin/login`.
- No public storefront layout was introduced into admin routes.

## Remaining visible issues

- No confirmed critical visible storefront issue remains in the tested KG routes and viewports.
- The desktop category strip is intentionally horizontally scrollable because there are more primary categories than can fit at every width.
- Some product names and construction terms are established technical or brand terminology and were not mechanically translated.
- The existing Vite large JavaScript chunk warning remains non-blocking and is outside this visual/localization stage.

## Backend/Render blocked issues

Production backend functionality is still blocked by owner infrastructure work:

1. Production PostgreSQL provisioning.
2. Render backend deployment and public backend URL.
3. Production secrets and first-admin bootstrap.
4. Prisma migrations and 179-product import on production.
5. Vercel API environment connection and full production Buyer/Admin E2E.

## Commands run

- `git status --short`
- `git log -1 --oneline`
- `git diff --stat`
- `git diff --check`
- localization searches with `rg`
- `npm.cmd run validate:catalog`
- `npm.cmd run generate:sitemap`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd run preview -- --host 127.0.0.1 --port 4182`
- `node scripts/stage28-storefront-qa.mjs`
- targeted desktop filled-cart and checkout browser QA
- `cd api && npm.cmd test`
- `cd api && npx.cmd prisma validate`

Command results:

- Catalog validation: passed, zero warnings.
- Sitemap generation: passed, 343 URLs.
- Frontend lint: passed.
- Frontend production build: passed.
- Browser matrix: passed, 154/154.
- Backend tests: passed, 29/29.
- Prisma validation: passed.
- Stage 28B diff check: passed.

## Files changed

- `scripts/stage28-storefront-qa.mjs`
- `src/components/cart/CartItem.jsx`
- `src/components/cart/CartSummary.jsx`
- `src/components/layout/Header.jsx`
- `src/components/marketing/TrustBlock.jsx`
- `src/components/product/ProductInfo.jsx`
- `src/config/site.js`
- `src/data/blogPosts.js`
- `src/data/catalogTree.js`
- `src/data/categoryAssets.js`
- `src/i18n/translations.js`
- `src/pages/CartPage.jsx`
- `src/pages/CheckoutPage.jsx`
- `src/pages/DeliveryPage.jsx`
- `src/pages/InfoPages.jsx`
- `src/pages/ProductPage.jsx`
- `src/pages/SubcategoryPage.jsx`
- `src/services/productService.js`
- `src/services/whatsappService.js`
- `src/styles/global.css`
- `src/utils/seoUtils.js`
- `reports/stage28b-critical-storefront-localization-visual-polish.md`

## Safety check

- No `.env` file was added.
- No token, password, database URL, or real secret was added.
- No product image was changed.
- No Render, database, or Vercel environment configuration was changed.
- No old visual report, screenshot, photo artifact, ZIP archive, or unrelated roadmap file is intended for staging.
- Public routing and admin/public layout separation remain intact.
