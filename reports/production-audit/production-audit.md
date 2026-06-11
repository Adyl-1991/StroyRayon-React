# StroyRayon Production Audit

Generated: 2026-06-11T06:16:59.699Z

## Critical Issues
- None detected by automated checks

## Important Issues
- Admin/CRM production readiness is not implemented in the React storefront scope and remains a launch TODO.
- ppr-troynik-25mm: weak search aliases
- ppr-sharovyi-kran-25mm: weak search aliases
- kanalizatsiya-truba-50mm: short description
- kanalizatsiya-ugolok-50mm-45: short description, weak search aliases
- kanalizatsiya-troynik-110-50mm: weak search aliases
- ashkana-smesiteli-basic: short description, weak search aliases
- vanna-smesiteli-dush-komplekti: weak search aliases
- drel-650w-udarnyi: short description, weak search aliases
- akkumulyatorduk-shurupovert-12v: weak search aliases
- molotok-500g: short description, weak search aliases
- portlandcement-m500-50kg: short description, weak search aliases
- plitka-kleyi-standard-25kg: weak search aliases
- gips-shtukaturkasy-30kg: weak search aliases
- kabel-vvgng-3x2-5: short description, weak search aliases
- rozetka-ichki-montazh-ak: short description, weak search aliases
- avtomat-16a-1p: short description, weak search aliases
- samorez-gipsokarton-35x35: short description, weak search aliases
- dyubel-6x40mm: short description, weak search aliases
- anker-bolt-10x80mm: weak search aliases
- unitaz-kompakt-ak-standart: weak search aliases
- rakovina-keramika-50sm: weak search aliases
- sifon-botolko-40mm: weak search aliases
- sharovyi-kran-latun-12: weak search aliases
- ichki-dubal-boyogu-ak-10l: weak search aliases
- fasad-boyogu-ak-10l: weak search aliases
- emal-ak-27kg: weak search aliases
- valik-boyok-uchun-250mm: weak search aliases
- alyuminii-radiator-500mm-sekciya: weak search aliases
- radiator-termostatikalyk-bash: weak search aliases
- sugat-shlangy-34-25m: weak search aliases

## Minor Issues
- No local WebP product photo detected: kanalizatsiya-truba-50mm
- No local WebP product photo detected: kanalizatsiya-truba-110mm
- No local WebP product photo detected: akkumulyatorduk-shurupovert-12v
- No local WebP product photo detected: molotok-500g
- No local WebP product photo detected: rozetka-ichki-montazh-ak
- No local WebP product photo detected: samorez-gipsokarton-35x35
- No local WebP product photo detected: dyubel-6x40mm
- No local WebP product photo detected: anker-bolt-10x80mm
- No local WebP product photo detected: unitaz-kompakt-ak-standart
- No local WebP product photo detected: rakovina-keramika-50sm
- No local WebP product photo detected: gibkaya-podvodka-60sm-12
- No local WebP product photo detected: sharovyi-kran-latun-12
- No local WebP product photo detected: ichki-dubal-boyogu-ak-10l
- No local WebP product photo detected: fasad-boyogu-ak-10l
- No local WebP product photo detected: emal-ak-27kg
- No local WebP product photo detected: valik-boyok-uchun-250mm
- No local WebP product photo detected: alyuminii-radiator-500mm-sekciya
- No local WebP product photo detected: radiator-termostatikalyk-bash
- No local WebP product photo detected: teplyi-pol-truba-16mm
- No local WebP product photo detected: sugat-shlangy-34-25m
- No local WebP product photo detected: kurok-metall-saptuu
- No local WebP product photo detected: sugaruu-nasadka-komplekti
- No local WebP product photo detected: montazh-kobugu-750ml
- No local WebP product photo detected: eshik-tutkasy-komplekt
- No local WebP product photo detected: pvh-podokonnik-200mm
- No local WebP product photo detected: vlagostoikii-gipsokarton-125mm
- No local WebP product photo detected: metall-plastik-truba-16mm
- No local WebP product photo detected: elektr-shit-12-modul
- No local WebP product photo detected: led-lampa-e27-12w
- No local WebP product photo detected: shurup-po-derevu-4x50mm
- No local WebP product photo detected: bolt-gaika-shaiba-m8-komplekt
- No local WebP product photo detected: metall-homut-20-32mm
- No local WebP product photo detected: stroitelnyi-gips-25kg
- No local WebP product photo detected: profnastil-krovlya-08mm
- No local WebP product photo detected: plastifikator-beton-1l
- No local WebP product photo detected: ppr-klipsa-20
- No local WebP product photo detected: pnd-fiting-mufta-25
- No local WebP product photo detected: kanalizaciya-truba-naruzhnaya-110
- No local WebP product photo detected: obratnyi-klapan-12
- No local WebP product photo detected: manometr-6bar

## Commercial Launch Blockers
- Admin/CRM remains TODO: secure login, roles, product/category CRUD, price/stock edit, image upload, order management, status changes, validation, audit logs.

## SEO Blockers
- None detected by automated checks

## Mobile Blockers
- Visual report has 222 screenshots across all required viewport widths.

## Content Blockers
- 136 products still rely on placeholder, SVG, or planned image fallback instead of confirmed local WebP photo.
- 166 products need manual content review for descriptions, aliases, specs, FAQ, or package details.

## Route And Alias Checks
- /product/kabel-vvgng -> /product/kabel-vvgng-3x2-5
- /product/gips-shtukaturka -> /product/gips-shtukaturkasy-30kg
- /product/smesitel-kuhnya -> /product/ashkana-smesiteli-basic

## Sitemap
- URL count: 341
- Missing static routes: 0
- Legacy alias URLs in sitemap: 0

## Exact Files To Change
- src/app/router.jsx
- src/pages/InfoPages.jsx
- src/components/layout/Footer.jsx
- src/components/seo/Seo.jsx
- src/services/whatsappService.js
- src/scripts/generateSitemap.js
- scripts/visual-audit-capture.mjs
- scripts/production-audit.mjs

## Exact Routes Affected
- /about
- /payment
- /return
- /privacy
- /product/*
- /cart
- /checkout
- /catalog/*
