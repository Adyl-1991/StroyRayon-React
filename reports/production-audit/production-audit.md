# StroyRayon Production Audit

Generated: 2026-06-11T08:14:20.588Z

## Critical Issues
- None detected by automated checks

## Important Issues
- Admin/CRM production readiness is not implemented in the React storefront scope and remains a launch TODO.

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

## Content Readiness
- Descriptions ready: 177/177
- SEO title/meta ready: 177/177
- FAQ ready: 177/177
- Search aliases ready: 177/177

## Product Image Status
- Real local WebP: 41
- Branded placeholder: 86
- Placeholder only: 50
- Missing local WebP: 136
- Full list: reports/production-audit/product-image-status.md

## Route And Alias Checks
- /product/kabel-vvgng -> /product/kabel-vvgng-3x2-5
- /product/gips-shtukaturka -> /product/gips-shtukaturkasy-30kg
- /product/smesitel-kuhnya -> /product/ashkana-smesiteli-basic

## Sitemap
- URL count: 341
- Missing static routes: 0
- Legacy alias URLs in sitemap: 0

## Exact Files To Maintain Next
- src/data/products.js
- src/data/productAssets.js
- public/images/products/{product-slug}/main.webp
- scripts/production-audit.mjs
- reports/production-audit/product-image-status.md

## Exact Routes Affected
- /about
- /payment
- /return
- /privacy
- /product/*
- /cart
- /checkout
- /catalog/*
