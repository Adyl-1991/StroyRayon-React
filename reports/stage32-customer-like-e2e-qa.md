# Stage 32 — Customer-like Storefront E2E QA

## 1. Summary

Added a customer-like browser QA command for the static storefront:

```bash
npm run qa:customer
```

The command starts the production Vite preview, opens headless Chrome through the Chrome DevTools Protocol, and exercises the storefront as a buyer in KG and RU. A matching live command was also added:

```bash
npm run qa:customer:live
```

Production preview result: **1462/1462 checks passed**.
Live Vercel result: **1462/1462 checks passed**.

## 2. New QA command

`scripts/customer-storefront-qa.mjs` covers:

- production preview startup and cleanup;
- headless Chrome lifecycle;
- KG/RU locale setup and validation;
- responsive route audits;
- mixed KG/RU search terms;
- product, cart, checkout, and WhatsApp flow;
- browser console, failed request, broken image, blank page, and horizontal overflow checks;
- JSON results written only to the system temporary directory.

No screenshots or videos are generated in the repository.

## 3. Customer flows tested

For both KG and RU at 360, 390, 768, 1024, and 1366 px:

1. Opened the storefront and catalog.
2. Verified public Header/Footer and localized category chips.
3. Opened a category and followed a product card.
4. Verified product title, price, unit, breadcrumbs, and active add-to-cart control.
5. Added a product and checked that the header cart badge increased.
6. Opened the cart, increased and decreased quantity, and verified that the total changed without `NaN`.
7. Removed the item and verified the localized empty-cart state.
8. Added the product again and opened checkout.
9. Verified required fields, order summary, disclaimer/preview area, and localized WhatsApp CTA.
10. Filled customer data and submitted through an intercepted `window.open`.

## 4. Search terms tested

The following queries were submitted through the real Header search form in KG and RU:

- `цемент`
- `труба`
- `насос`
- `смеситель`
- `кабель`
- `автомат`
- `боёк`
- `вентиляция`

Every query preserved its URL state and rendered either product cards or a clean empty state without a crash.

## 5. Cart flow result

Passed in both locales and all five viewports:

- localStorage cart persistence;
- cart badge increment;
- quantity `+` and `-`;
- total recalculation;
- remove item;
- empty-cart state;
- re-add and continue to checkout;
- no invalid or `NaN` price output.

## 6. Checkout flow result

Passed with:

- Name: `Тест Кардар`
- Phone: `+996 700 000 000`
- Address: `Бишкек`
- Comment: `Автоматтык QA тест, жөнөтпөңүз`

Empty required fields kept submission disabled. After filling, the order preview contained customer data, product name, quantity/price data, total, and comment.

## 7. WhatsApp link/message result

Passed.

The QA command replaces `window.open` before application code runs. Therefore no real WhatsApp page is opened and no message is sent. The intercepted URL was validated for:

- `https://wa.me/` or `https://api.whatsapp.com/`;
- URL-encoded `text` query;
- customer name, phone, address, and comment;
- product name;
- order total;
- absence of `NaN`.

## 8. KG/RU result

Passed.

- Header category chips matched the active language.
- Cart and checkout headings matched the active language.
- Checkout WhatsApp CTA matched the active language.
- Document `lang` was `ky` for KG and `ru` for RU.

The existing `qa:stage31` regression suite also passed: **280/280 route-locale-viewport checks**.

## 9. Viewports checked

- 360 px mobile
- 390 px mobile
- 768 px tablet
- 1024 px tablet/desktop
- 1366 px desktop

No horizontal overflow was found in the tested routes or checkout flow.

## 10. Console/network/image issues

Production preview:

- console errors: 0;
- failed storefront assets/requests: 0;
- broken images: 0;
- blank/fatal pages: 0;
- horizontal overflow issues: 0.

Live Vercel:

- console errors: 0;
- failed storefront assets/requests: 0;
- broken images: 0;
- blank/fatal pages: 0;
- horizontal overflow issues: 0.

## 11. Issues fixed

No storefront production code change was required.

The first QA run exposed an assertion mismatch: `/catalog` uses `.catalog-directory-section` rather than the older `.category-card` selector. The QA selector was corrected to recognize the actual directory layout. The complete rerun then passed 1462/1462.

## 12. Remaining issues

No static buyer-flow issue was found.

The Vite build continues to report the existing large JavaScript chunk warning. It does not block the build or the tested buyer flow and was not expanded into a refactor in Stage 32.

## 13. Backend/Render blocked issues

Render/PostgreSQL production is not deployed and Vercel is currently using the static WhatsApp checkout path. Therefore these API-only production checks remain blocked:

- production order persistence;
- server-authoritative total verification on live infrastructure;
- production stock reservation/write-off/release;
- production admin visibility of a newly created buyer order.

These are infrastructure blockers, not failures of the static buyer flow. Local backend tests remain green.

## 14. Commands run

```text
npm run validate:catalog       PASS — 0 warnings
npm run generate:sitemap       PASS — 343 URLs, 0 warnings
npm run lint                   PASS
npm run build                  PASS
npm run qa:stage31             PASS — 280/280, 0 issues
npm run qa:customer            PASS — 1462/1462, 0 issues
npm run qa:customer:live       PASS — 1462/1462, 0 issues
cd api && npm test             PASS — 29/29
cd api && npx prisma validate  PASS
git diff --check               PASS for Stage 32 files
```

## 15. Files changed

- `package.json`
- `scripts/customer-storefront-qa.mjs`
- `reports/stage32-customer-like-e2e-qa.md`

## 16. Safety check

- No real WhatsApp message was sent.
- No `.env`, secret, token, password, or DB URL was added.
- No Render, PostgreSQL, or Vercel environment setting was changed.
- No public storefront or admin UI code was changed.
- No screenshots, videos, temp output, old visual reports, or photo artifacts are part of Stage 32.
