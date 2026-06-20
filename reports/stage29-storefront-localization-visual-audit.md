# Stage 29 — Full Storefront Localization + Visual QA Audit

Date: 2026-06-20

Actual audited commit: `f0f5a9ca6311bc48c2d45d24316dfb5accb8b116`

The task brief referenced `5e94f9dd952a2540b89e7a57e2d05751e227931e`, but Stage 28B had already been completed and pushed. At the start of Stage 29, local `HEAD` and `origin/main` both pointed to `f0f5a9c`.

## 1. Summary

Stage 29 was performed as a report-first audit. No storefront source fix or redesign was made.

Audit result:

- Routes audited: 22.
- Viewports audited: 7.
- Local automated checks: 154/154 route/viewport states passed.
- Live automated checks: 154 states exercised; one transient `/catalog` blank navigation occurred in the long CDP run and passed immediately in an isolated retest.
- Confirmed Critical issues: 0.
- Confirmed High issues: 1.
- Confirmed Medium issues: 2.
- Confirmed Low issues: 3.
- Confirmed visible KG/RU leakage from the requested word list: none in the final rendered KG storefront.
- Admin/public layout separation: passed.
- Buyer cart quantity and checkout rendering smoke: passed locally and live.

Stage 28B successfully removed the known visible strings `Главная`, `Разделы`, `Товары в этом разделе`, `Краски и обои`, `Стройматериал`, `Корзина`, `Заказ жыйынтыгы`, `Заказга өтүү`, and default-style `Удалить` from the rendered KG storefront.

The most important remaining visible defect is the desktop header at approximately 940–1100 px: at 1024 px the brand name is squeezed behind the Catalog button.

## 2. Audit scope

The audit covered:

- KG/RU localization context, not only raw grep matches;
- category chip, breadcrumb, card, and page-title consistency;
- category sections and product-section spacing;
- header, search, category strip, card grids, cart, checkout, footer;
- horizontal overflow, blank pages, broken images, console errors, failed requests;
- mobile, tablet, and desktop visual hierarchy;
- public/admin layout separation;
- static buyer flow because production Render/PostgreSQL is not available.

Screenshots were generated only in `%TEMP%`. They are not part of the repository or commit.

## 3. Routes checked

Public:

1. `/`
2. `/catalog`
3. `/catalog/kurulush`
4. `/catalog/inzhenerdik-santehnika`
5. `/catalog/santehnika`
6. `/catalog/elektrika`
7. `/catalog/shaimandar`
8. `/catalog/bekitkich`
9. `/catalog/boiok-tush-kagaz`
10. `/catalog/ventilyaciya`
11. `/cart`
12. `/checkout`
13. `/search`
14. `/contacts`
15. `/delivery`
16. `/about`
17. `/payment`
18. `/return`
19. `/privacy`

Admin separation:

20. `/admin/login`
21. `/admin/orders`
22. `/admin/products`

## 4. Viewports checked

- 360 px
- 390 px
- 430 px
- 768 px
- 1024 px
- 1366 px
- 1440 px

## 5. Critical issues

Count: **0**

No confirmed issue broke public navigation, category browsing, cart quantity changes, checkout form rendering, or admin-route separation.

Production order creation and authenticated admin E2E are not classified here because they are blocked by missing production infrastructure rather than a newly found storefront visual defect.

## 6. High issues

Count: **1**

### HIGH-01 — Header brand collision around 1024 px

Affected route:

- all public routes using the shared Header;
- confirmed on `/` at 1024 px.

Observed:

- the logo mark area renders at the left;
- the `StroyRayon` brand name is squeezed and partially hidden behind the `Каталог` button;
- search and desktop navigation remain functional, but the brand header looks broken.

Why it matters:

- it is above the fold on every storefront route;
- damaged branding reduces production trust;
- automated overflow checks do not detect it because the elements overlap or compress inside the header grid rather than extending beyond the viewport.

Likely cause:

- the desktop breakpoint starts at 940 px;
- `.header-main` switches to `auto auto minmax(360px, 1fr) auto auto`;
- the combined brand, catalog button, minimum search width, navigation, and locale switch do not fit reliably around 1024 px.

Recommended Stage 30 fix:

- use an intermediate header layout between roughly 940 and 1120/1180 px;
- either place search on a second row, hide the separate Catalog button, reduce the minimum search width, or collapse selected desktop navigation;
- add an automated overlap/visibility assertion for `.brand-logo__name`.

## 7. Medium issues

Count: **2**

### MEDIUM-01 — Mobile cart/checkout has excessive vertical spacing

Affected routes:

- `/cart`
- `/checkout`
- strongest at 360–430 px with a filled cart.

Observed:

- the content is usable and the fixed mobile navigation does not prevent checkout;
- however, large stacked bottom spacing creates long empty regions before the footer;
- checkout has a large separation before the order preview/summary;
- the page feels longer than the content requires.

Relevant CSS:

- mobile page padding includes `184px + safe-area`;
- cart/checkout summary adds another `84px + safe-area` margin;
- checkout order preview adds an additional 84 px top margin.

Recommended Stage 30 fix:

- reserve only the actual fixed-nav height once;
- remove duplicate summary/preview spacing;
- verify scroll-to-submit and footer spacing at 360, 390, and 430 px.

### MEDIUM-02 — Tablet home order process is unnecessarily one-column

Affected route:

- `/`
- confirmed at 768 px.

Observed:

- the four order steps render as one long vertical sequence;
- only the first step and part of the second are visible in a 768×1024 viewport;
- the layout is readable but uses tablet space inefficiently and adds avoidable scrolling.

Recommended Stage 30 fix:

- use a 2×2 step grid at tablet widths;
- keep the current single-column layout for narrow mobile;
- retain the four-column desktop layout.

## 8. Low issues

Count: **3**

### LOW-01 — Horizontal category strip has weak discoverability

Affected routes:

- all public routes with the category strip;
- most visible from 360 to 1366 px.

Observed:

- horizontal scrolling works and no page overflow was detected;
- the final chip is often partially clipped at the right edge;
- there is no fade, arrow, or other explicit indication that more categories are available.

Recommended Stage 30 fix:

- add a subtle edge fade or accessible scroll affordance;
- do not convert the strip into a wrapping multi-row header.

### LOW-02 — English accessibility labels remain in public navigation

Text found:

- `Language`
- `Mobile menu`

Files:

- `src/components/layout/Header.jsx`
- `src/components/layout/MobileNav.jsx`

Routes affected:

- all public routes.

Is it a visible bug?

- no for sighted users;
- yes as a minor KG localization/a11y consistency issue for assistive technology.

Recommended KG replacement:

- `Тил тандоо`
- `Мобилдик меню`

### LOW-03 — Raw KG product dataset still contains legacy Russian terms

Text found:

- `Заказ`
- `Заказ менен`
- related inflected forms in KG product fields.

File:

- `src/data/products.js`

Routes affected:

- product pages, product-derived cart/checkout text, and SEO fields in principle.

Is it a current rendered bug?

- no in tested KG UI;
- Stage 28B `normalizeKgText()` converts the known terms before rendering in the audited paths.

Risk:

- future components may display a raw field without the normalizer;
- source data remains harder to maintain and audit.

Recommended Stage 30 action:

- migrate KG dataset values to native Kyrgyz terms;
- keep the normalizer as a defensive fallback;
- add a catalog validation rule that reports forbidden Russian tokens in `*Kg` fields.

## 9. Localization leakage table

| Text found | File/context | Route affected | Bug? | Recommended KG replacement/action |
|---|---|---|---|---|
| `Главная`, `Разделы`, `Корзина`, `Открыть категорию`, `товаров найдено` | `src/i18n/translations.js`, `ru` locale | RU mode only | No | Keep as legitimate Russian locale |
| `Товары в этом разделе` | `src/i18n/translations.js`, `ru.catalog` | RU mode category pages | No | Keep as legitimate Russian locale |
| `Краски и обои`, `Стройматериал` | `catalogTranslations.*.ru` and `titleRu` | RU mode | No | Keep as legitimate Russian locale |
| `Заказ`, `Заказы` | `src/admin/**` | Admin CRM only | No | Keep unless a separate admin-localization stage is requested |
| `Заказ` / `Заказ менен` | `src/data/products.js`, KG fields | Product-derived public copy | No visible leak in tested UI; maintenance risk | Migrate source to `Буйрутма`; retain runtime fallback |
| `Каталог` | KG dictionary and public components | Public KG routes | No | `Каталог` is accepted by the brief |
| `Language` | Header aria label | All public routes | Low | `Тил тандоо` |
| `Mobile menu` | MobileNav aria label | All public routes | Low | `Мобилдик меню` |

Rendered KG detector checked:

- `Главная`
- `Разделы`
- `Товары в этом разделе`
- `Краски и обои`
- `Стройматериал`
- `Корзина`
- `Удалить`
- `Открыть категорию`
- `Комментарий`
- `Заказ*`
- `налич*`

Final local matrix found zero rendered matches.

## 10. Category naming inconsistency table

| Route | Header chip | Page title | Breadcrumb | Status |
|---|---|---|---|---|
| `/catalog/kurulush` | `Курулуш материалдары` | `Курулуш материалдары` | `Курулуш материалдары` | Consistent |
| `/catalog/inzhenerdik-santehnika` | `Инженердик сантехника` | same | same | Consistent |
| `/catalog/santehnika` | `Сантехника` | same | same | Consistent |
| `/catalog/elektrika` | `Электрика` | same | same | Consistent |
| `/catalog/shaimandar` | `Шаймандар` | same | same | Consistent |
| `/catalog/bekitkich` | `Бекиткич` | same | same | Consistent |
| `/catalog/boiok-tush-kagaz` | `Боёк, туш жана кагаз` | same | same | Consistent |
| `/catalog/ventilyaciya` | `Вентиляция` | same | same | Consistent |

The alias routes resolve correctly while existing canonical catalog slugs remain intact.

## 11. Cart/checkout UI issues

Passed:

- `Буйрутма жыйынтыгы` is rendered.
- `Буйрутма берүүгө өтүү` is rendered.
- remove action is styled, not a browser-default button.
- quantity control, line total, and remove action are visually coherent.
- filled cart quantity changed from 1 to 2.
- checkout form and summary rendered.
- `Кошумча маалымат` is used instead of `Комментарий`.
- price/availability disclaimer is visible.

Remaining:

- MEDIUM-01 excessive mobile vertical spacing;
- order preview is dense monospaced content and could use a compact item-summary presentation, though it remains readable and functional.

## 12. Mobile/desktop layout issues

Passed:

- no measured horizontal page overflow in the 154-state local matrix;
- no broken images detected by the final automated matrix;
- no confirmed console errors or failed application requests;
- category card grids adapt across all seven widths;
- category-to-product-section spacing is clear at 1366 and 1440 px;
- mobile category pages retain readable headings and card spacing;
- footer remains usable above the fixed mobile navigation;
- 1366 and 1440 desktop headers render correctly.

Issues:

- HIGH-01 shared header collision around 1024 px;
- MEDIUM-01 mobile cart/checkout whitespace;
- MEDIUM-02 inefficient 768 px order-process layout;
- LOW-01 weak horizontal-scroll affordance.

Automation note:

- the long live CDP run produced one blank `/catalog` result at 430 px;
- the exact route and viewport passed immediately in an isolated live rerun;
- the same type of one-off blank has occurred at different routes during rapid sequential live navigation;
- it is classified as automation/network timing noise, not a confirmed storefront defect.

## 13. Admin separation check

- `/admin/login` renders without public Header/Footer.
- unauthenticated `/admin/orders` redirects to `/admin/login`.
- unauthenticated `/admin/products` redirects to `/admin/login`.
- public storefront navigation was not introduced into the admin shell.
- Russian admin CRM copy is intentional and was not counted as public KG leakage.

## 14. Backend/Render blocked issues

The five production blockers remain:

1. Production PostgreSQL is not provisioned.
2. Render backend and public backend URL are not available.
3. Production environment values and admin bootstrap credentials are not set.
4. Prisma migrations and 179-product import are not run in production.
5. Vercel API connection and real Buyer/Admin production E2E cannot be completed.

The live storefront remains in static/fallback mode. No real localhost API request was observed in the audited browser network traffic.

## 15. Recommended fix plan for Stage 30

Priority 1:

1. Fix the 940–1120/1180 px header layout.
2. Add an automated element-overlap/brand-visibility assertion.

Priority 2:

3. Simplify mobile cart/checkout bottom spacing.
4. Compact the checkout order preview.
5. Use a 2×2 order-process layout at tablet width.

Priority 3:

6. Add a category-strip scroll affordance.
7. Localize public accessibility labels.
8. Migrate legacy Russian tokens out of KG product dataset fields.
9. Add forbidden-token checks to catalog validation.

Stage 30 should remain a targeted polish stage; no redesign, photo batch, backend architecture change, or production-env work is required for these findings.

## 16. Commands run

- `git status --short`
- `git log -1 --oneline`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git diff --stat`
- `git diff --check`
- localization searches with `rg`
- `npm.cmd run preview -- --host 127.0.0.1 --port 4182`
- full local `node scripts/stage28-storefront-qa.mjs`
- full live `node scripts/stage28-storefront-qa.mjs`
- isolated live `/catalog` 430 px retest
- targeted Home screenshots at 768, 1024, and 1366 px
- targeted filled cart/checkout audit
- required validation commands listed below

## 17. Files changed

Stage 29 changes only:

- `reports/stage29-storefront-localization-visual-audit.md`

No storefront source fix was made in Stage 29.

## 18. Safety check

- No `.env` file was changed or staged.
- No token, password, database URL, or secret was added.
- No product image was changed.
- No Render, PostgreSQL, DNS, or Vercel environment configuration was changed.
- No generated screenshot is intended for commit.
- Existing old visual reports, screenshots, ZIP files, photo artifacts, and unrelated roadmap files remain unstaged.
