# Stage 31 — Full KG/RU Language Switch Audit + Fix

## 1. Summary

The public storefront language switch now updates the complete active storefront shell and the audited public routes. The original defect was confirmed in `Header.jsx`: category chips stored only `labelKg` and rendered it regardless of the selected locale.

The fix extends the existing `LocaleContext` architecture instead of introducing another localization system. Header chips, footer links, cart, checkout, search, home trust/blog content, contacts, delivery and static information pages now use locale-aware content. Catalog nodes and cart items also have safe RU fallback behavior.

## 2. Language switch architecture

- State owner: `src/i18n/LocaleContext.jsx`
- Storage key: `stroyrayon.locale`
- Supported values: `kg`, `ru`
- Persistence: browser `localStorage`
- Document language:
  - KG → `<html lang="ky">`
  - RU → `<html lang="ru">`
- UI dictionary: `src/i18n/translations.js`
- Catalog localization:
  - explicit `catalogTranslations`
  - node `titleKg` / `titleRu`, `descriptionKg` / `descriptionRu`, `seoTextKg` / `seoTextRu`
  - safe RU title and neutral-description fallback in `src/i18n/catalogRuFallbacks.js`
- Product localization: selectors in `src/services/productService.js`

## 3. Hardcoded text found

The active public route/component diff removed or replaced 154 source lines containing visible hardcoded KG text. Main affected areas:

- header category chips and materials CTA;
- footer static links;
- cart item controls and summary;
- checkout labels, validation, confirmation and order preview;
- search title, results and empty state;
- home trust block and article previews;
- contacts and delivery pages;
- about, payment, return and privacy pages;
- pagination, empty-state action and sale badge;
- catalog ARIA labels.

Admin-only Russian text was not classified as a public storefront localization defect.

Unused legacy `CategoryPage.jsx`, `SubcategoryPage.jsx`, `CatalogSidebar.jsx` and `CategoryCard.jsx` are not mounted by the current router. They were recorded as legacy code rather than mixed into the live-route fix.

## 4. Header category chips fix

The header now keeps explicit KG and RU labels for every chip and renders `item[locale]`.

KG:

- Курулуш
- Инженердик сантехника
- Сантехника
- Электрика
- Шаймандар
- Бекиткич
- Боёк
- Вентиляция

RU:

- Стройматериалы
- Инженерная сантехника
- Сантехника
- Электрика
- Инструменты
- Крепёж
- Краски и обои
- Вентиляция

The header ARIA label and WhatsApp materials CTA also follow the active language.

## 5. Routes checked in KG/RU

Each route was checked in both languages:

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
- `/product/ppr-truba-pn20`
- `/cart`
- `/checkout`
- `/search`
- `/contacts`
- `/delivery`
- `/about`
- `/payment`
- `/return`
- `/privacy`

Admin separation smoke:

- `/admin/login`
- `/admin/orders`
- `/admin/products`

## 6. KG mode result

PASS.

- KG header chips and public labels displayed correctly.
- Breadcrumb home label was `Башкы бет`.
- Catalog, category, cart, checkout, search and static-page headings used KG.
- No monitored RU public UI phrase leaked into KG mode.

## 7. RU mode result

PASS.

- RU category chips updated immediately after clicking RU.
- Breadcrumb home label was `Главная`.
- Catalog cards, category headings and child titles used RU.
- Cart, checkout, search and static pages used RU.
- No monitored KG public UI phrase leaked into RU mode.

## 8. Public UI labels fixed

- Header navigation, chips and CTA
- Footer information links
- Catalog labels, pagination and ARIA text
- Cart title, quantity controls, remove action and totals
- Checkout form, validation, confirmation and WhatsApp order text
- Search page labels and empty state
- Home trust block and blog previews
- Contacts, delivery, about, payment, return and privacy pages
- Product sale badge
- Default empty-state catalog action

Cart items now retain both product titles and RU package information for new cart entries. Existing persisted items resolve current product data by slug, so switching language also updates product names already in the cart.

## 9. Category/product content fallback issues

Product audit:

- Products: 179
- RU titles: 179/179
- RU short descriptions: 179/179
- RU full descriptions: 179/179
- RU specifications: 179/179
- RU FAQ: 179/179
- RU SEO title/description: 179/179

Catalog audit:

- Catalog nodes: 155
- RU titles resolved: 155/155
- Nodes without an individually curated RU description: 100

For those 100 nodes, RU mode uses a neutral Russian description based on the resolved RU title. It never falls back visibly to the KG description.

## 10. Automated QA added

- Script: `scripts/stage31-language-qa.mjs`
- Command: `npm.cmd run qa:stage31`
- Public checks: 280
- Routes: 20
- Locales: KG and RU
- Viewports: 7
- Issues: 0
- Additional checks:
  - live KG → RU button switch;
  - exact first eight header chips;
  - expected route heading;
  - HTML language;
  - language leakage markers;
  - horizontal overflow;
  - broken images;
  - public Header/Footer presence;
  - admin/public layout separation.

QA output is stored only in the operating-system temp directory.

## 11. Viewports checked

- 360
- 390
- 430
- 768
- 1024
- 1366
- 1440

No horizontal overflow was detected with the longer RU labels.

## 12. Remaining language issues

No visible KG/RU leakage remains on the audited active public routes.

Content-quality follow-up:

- 100 catalog nodes use safe generated RU descriptions rather than individually edited copy.
- Four unused legacy catalog files still contain old hardcoded text but are not reachable from the active router.

## 13. Recommended Stage 32

Optional content refinement:

1. Write unique RU descriptions and SEO copy for the 100 catalog nodes currently using the safe fallback.
2. Remove or modernize the unused legacy catalog page/components after confirming no external imports depend on them.
3. Add editorial review for technical terminology consistency across KG and RU.

These are content-quality tasks, not launch-blocking language-switch defects.

## 14. Commands run

- `npm.cmd run qa:stage31` — passed, 280 checks, 0 issues
- `npm.cmd run validate:catalog` — passed, 0 warnings
- `npm.cmd run generate:sitemap` — passed, 343 URLs, 0 warnings
- `npm.cmd run lint` — passed
- `npm.cmd run build` — passed
- `npm.cmd test` in `api` — passed, 29/29
- `npx.cmd prisma validate` in `api` — passed
- `git diff --check` — run before commit

## 15. Files changed

- localization dictionary and RU catalog fallback;
- active public Header/Footer and shared UI components;
- cart/checkout/search/catalog/home/static pages;
- localized cart and WhatsApp order helpers;
- localized blog preview data;
- Stage 31 browser QA script and npm command;
- this report.

No product image, layout redesign, backend deployment, environment or admin CRM behavior was changed.

## 16. Safety check

- No `.env` file staged.
- No secret, token, password or database URL added.
- No old visual-audit screenshot staged.
- No photo batch or temporary browser artifact staged.
- Existing unrelated dirty reports/screenshots remain outside the Stage 31 commit.
