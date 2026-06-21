# Stage 31B — Live Header i18n Hotfix

## Live bug confirmed

The exact reported mixed-language state is present in the previously deployed Stage 30 code (`f7301cc`):

- main navigation already used `t(...)`, so RU displayed `Доставка`, `Контакты`, `Корзина`;
- category items only had `labelKg` and rendered `item.labelKg`;
- the materials CTA was hardcoded in KG.

A new clean Chrome profile against the live site on June 21, 2026 received the newer Stage 31 bundle (`index-BDV1tIPj.js`). At that point the eight RU chips were already correct, so the stale chip state was not reproducible in a fresh session. The reported browser state matches an SPA tab that remained open with the older Stage 30 JavaScript bundle.

The live CTA regression was reproduced before this hotfix:

- KG: `Материалдар тизмеси? / WhatsAppка жөнөтүңүз`
- RU: `Есть список материалов? / Отправьте в WhatsApp`

The updated focused QA failed on both CTA variants before the hotfix.

## Root cause

Two causes were identified:

1. The original production regression came from the Stage 30 Header implementation, where the main navigation was localized but chips and CTA were hardcoded KG.
2. Stage 31 moved chip labels into locale-aware component data, but its automated QA did not assert the exact CTA text or header-scoped forbidden-language text. It also tested dev mode by default and did not explicitly support production preview.

An already-open SPA tab does not replace its loaded JavaScript when Vercel deploys a new immutable asset. A hard reload or new tab was therefore required to receive the Stage 31 bundle.

## Exact files changed

- `src/components/layout/Header.jsx`
- `src/i18n/translations.js`
- `scripts/stage31-language-qa.mjs`
- `reports/stage31b-live-header-i18n-hotfix.md`

## Header chips fix

Header chip labels now come from the same active translation dictionary as the main navigation:

`t('header.categoryChips.<key>')`

RU:

- Стройматериалы
- Инженерная сантехника
- Сантехника
- Электрика
- Инструменты
- Крепёж
- Краски и обои
- Вентиляция

KG:

- Курулуш
- Инженердик сантехника
- Сантехника
- Электрика
- Шаймандар
- Бекиткич
- Боёк
- Вентиляция

## WhatsApp CTA fix

RU:

- `Список материалов?`
- `Отправить в WhatsApp`

KG:

- `Материалдар тизмеси?`
- `WhatsAppка жөнөтүү`

## QA updated

`npm run qa:stage31` now asserts:

- exact first eight KG and RU chip labels;
- exact KG and RU CTA title/action;
- forbidden opposite-language text inside the header strip;
- live KG → RU click updates both chips and CTA;
- dev or production-preview server mode;
- optional focused route and viewport for live diagnostics.

Focused pre-push live QA correctly failed on the old CTA copy.

## Routes and viewports checked

Full matrix:

- 20 public routes;
- KG and RU;
- 360, 390, 430, 768, 1024, 1366 and 1440 px;
- 280 public checks;
- admin layout separation for login, orders and products.

Production build preview result: 0 issues.

Final standard `qa:stage31` result: 0 issues.

## Commands run

- `npm.cmd run validate:catalog` — passed, 0 warnings
- `npm.cmd run generate:sitemap` — passed, 343 URLs
- `npm.cmd run lint` — passed
- `npm.cmd run build` — passed
- `npm.cmd run qa:stage31` — passed, 280 checks, 0 issues
- production preview `qa:stage31` — passed, 280 checks, 0 issues
- API `npm.cmd test` — passed, 29/29
- `npx.cmd prisma validate` — passed
- focused live pre-push QA — failed as expected on old CTA text

## Remaining issues

- Users with an old SPA tab may need one hard refresh after deployment.
- Two unrelated transient broken-image findings appeared during the first full live matrix. They were outside this header i18n hotfix and did not reproduce in local production preview.

## Safety check

- No Render, database or environment configuration changed.
- No product image changed.
- No secrets, tokens or `.env` files included.
- No screenshots or temporary QA files included.
- Existing unrelated dirty reports and visual-audit artifacts remain outside this commit.
