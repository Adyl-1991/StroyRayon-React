# Stage 15 — Global Content Audit

Audit date: 2026-06-18

Last product content commit: `d00d45dfcc6c39ca11124e37e437a55a1e291cf6` — Stage 14C: Complete construction materials content

## 1. Scope and repository state

- Products audited: **179**
- Product source checked: `src/data/products.js`
- No products were added or removed.
- No photos were searched, downloaded or replaced.
- Existing dirty visual-audit files and untracked legacy report folders were intentionally excluded from this audit commit.
- Stage 15 creates only this report and `scripts/stage15-global-content-audit.mjs`.

Pre-existing dirty files are mainly under:

- `reports/visual-audit-smoke/`
- `reports/visual-audit/`
- `reports/shtukaturka-audit/`
- `reports/stage1-etalon-audit/`
- `reports/stage5b-audit/`
- `reports/production-audit/stroyrayon-roadmap-from-constitution.md`

## 2. Global deep-content coverage

- Fully covered products: **179/179**
- Products with missing required fields: **0**

Checked fields:

`titleKg`, `titleRu`, `brand`, `productType`, `productTypeRu`, `price`, `unit`, `unitRu`, `pack`, `packRu`, `minOrder`, `minOrderRu`, `shortDescriptionKg`, `shortDescriptionRu`, `fullDescriptionKg`, `fullDescriptionRu`, `specificationsKg`, `specificationsRu`, `applicationKg`, `applicationRu`, `benefitsKg`, `benefitsRu`, `instructionsKg`, `instructionsRu`, `faqKg`, `faqRu`, `seoTitleKg`, `seoTitleRu`, `seoDescriptionKg`, `seoDescriptionRu`, `aliasesKg`, `aliasesRu`, `relatedProductIds`, `imageStatus`

### Missing fields

- No missing required fields.

## 3. Category coverage

| Category | Products | Deep content | Missing | imageStatus | Direct placeholder | Local WebP | Missing primary + fallback |
|---|---:|---:|---:|---|---:|---:|---:|
| Стройматериалы | 42 | 42/42 | 0 | needs-real-photo: 39; planned: 3 | 17 | 9 | 16 |
| Инженерная сантехника | 31 | 31/31 | 0 | planned: 10; needs-real-photo: 21 | 21 | 9 | 1 |
| Электрика | 24 | 24/24 | 0 | needs-real-photo: 24 | 24 | 0 | 0 |
| Сантехника | 13 | 13/13 | 0 | needs-real-photo: 13 | 13 | 0 | 0 |
| Инструмент | 15 | 15/15 | 0 | needs-real-photo: 15 | 15 | 0 | 0 |
| Боёк / түш / кагаз | 14 | 14/14 | 0 | needs-real-photo: 14 | 0 | 0 | 14 |
| Крепеж | 7 | 7/7 | 0 | needs-real-photo: 7 | 0 | 0 | 7 |
| Вентиляция | 9 | 9/9 | 0 | needs-real-photo: 9 | 0 | 3 | 6 |
| Тёплый пол | 11 | 11/11 | 0 | needs-real-photo: 11 | 0 | 0 | 11 |
| Бак / короо | 13 | 13/13 | 0 | needs-real-photo: 13 | 0 | 0 | 13 |

Category total: **179/179**

## 4. KG/RU leakage and text hygiene

- High-confidence KG fragments found in RU fields: **10**
- High-confidence RU sentences found in KG fields: **36**
- Products affected by at least one language-field issue: **43**
- Technical garbage/demo/template markers: **0**
- Empty required strings/arrays/objects: included in the missing-field count above (**0 products**).

### Leakage candidates

- `ashkana-smesiteli-basic` — KG text in RU field, `specificationsRu`: ү, үчүн
- `vanna-smesiteli-dush-komplekti` — KG text in RU field, `specificationsRu`: ү, менен
- `samorez-gipsokarton-35x35` — RU sentence in KG field, `specificationsKg`: назначение
- `dyubel-6x40mm` — RU sentence in KG field, `specificationsKg`: назначение
- `anker-bolt-10x80mm` — RU sentence in KG field, `specificationsKg`: назначение
- `ichki-dubal-boyogu-ak-10l` — RU sentence in KG field, `specificationsKg`: назначение
- `fasad-boyogu-ak-10l` — RU sentence in KG field, `specificationsKg`: назначение
- `emal-ak-27kg` — RU sentence in KG field, `specificationsKg`: назначение
- `valik-boyok-uchun-250mm` — RU sentence in KG field, `specificationsKg`: назначение
- `teplyi-pol-truba-16mm` — RU sentence in KG field, `specificationsKg`: назначение
- `shurup-po-derevu-4x50mm` — RU sentence in KG field, `specificationsKg`: назначение
- `bolt-gaika-shaiba-m8-komplekt` — RU sentence in KG field, `specificationsKg`: назначение
- `metall-homut-20-32mm` — RU sentence in KG field, `specificationsKg`: назначение
- `plastifikator-beton-1l` — RU sentence in KG field, `fullDescriptionKg`: для
- `plastifikator-beton-1l` — RU sentence in KG field, `seoTitleKg`: для
- `plastifikator-beton-1l` — RU sentence in KG field, `seoDescriptionKg`: для
- `plastifikator-beton-1l` — RU sentence in KG field, `aliasesKg`: для
- `rakovina-smesitel-basic` — KG text in RU field, `specificationsRu`: ү, үчүн
- `trap-dushevoi-10x10` — KG text in RU field, `specificationsRu`: ү
- `vodonagrevatel-50l` — KG text in RU field, `specificationsRu`: ү
- `aerator-smesitelya-m24` — KG text in RU field, `specificationsRu`: ү
- `mat-teplyi-pol-1m2` — RU sentence in KG field, `specificationsKg`: назначение
- `ventilyaciya-muftasy` — KG text in RU field, `specificationsRu`: ө, ү
- `obratnyi-klapan-ventilyaciya` — KG text in RU field, `specificationsRu`: ө, ү
- `mat-teplyi-pol-2m2` — RU sentence in KG field, `specificationsKg`: назначение
- `mat-teplyi-pol-3m2` — RU sentence in KG field, `specificationsKg`: назначение
- `kabeldik-teplyi-pol-10m` — RU sentence in KG field, `specificationsKg`: назначение
- `kabeldik-teplyi-pol-20m` — RU sentence in KG field, `specificationsKg`: назначение
- `mehanikalyk-termoregulyator` — RU sentence in KG field, `specificationsKg`: назначение
- `elektronduk-termoregulyator` — RU sentence in KG field, `specificationsKg`: назначение
- `pol-datchigi` — RU sentence in KG field, `specificationsKg`: назначение
- `teplyi-pol-montazh-lenta` — RU sentence in KG field, `specificationsKg`: назначение
- `teplyi-pol-kollektor-komplekt` — RU sentence in KG field, `specificationsKg`: назначение
- `vodoemulsiyalyk-boyok-10l` — RU sentence in KG field, `specificationsKg`: назначение
- `emal-pf115-kara` — RU sentence in KG field, `specificationsKg`: назначение
- `parket-lak` — RU sentence in KG field, `specificationsKg`: назначение
- `universal-koler` — RU sentence in KG field, `specificationsKg`: назначение
- `rastvoritel-646` — RU sentence in KG field, `specificationsKg`: назначение
- `kist-50mm` — RU sentence in KG field, `specificationsKg`: назначение
- `malyardyk-lenta` — RU sentence in KG field, `specificationsKg`: назначение
- `boyok-vannochka` — RU sentence in KG field, `specificationsKg`: назначение
- `boyok-gruntovka-10l` — RU sentence in KG field, `specificationsKg`: назначение
- `flizelin-tush-kagaz` — RU sentence in KG field, `specificationsKg`: назначение
- `filtr-korpusu-kluch-komplekt` — KG text in RU field, `specificationsRu`: менен
- `dush-sistemasy-basic` — KG text in RU field, `specificationsRu`: ү
- `perforaciyalangan-montazh-lenta` — RU sentence in KG field, `specificationsKg`: назначение

### Technical garbage candidates

- No mojibake, Lorem Ipsum, undefined, TODO, demo or template garbage detected.

### False-positive policy

- Russian technical loanwords in KG copy (профиль, штукатурка, крепеж, монтаж, комплект, кабель, фасад) are not treated as leakage by themselves.
- Brand names, model names, units and abbreviations (PPR, PVC, OSB, MDF, SDS+, WAGO, Knauf) are language-neutral.
- Cross-category related products are reported as semantic-review candidates, not structural errors; many are legitimate system components or cross-sells.

## 5. Related products audit

- Invalid related IDs: **0**
- Duplicate related IDs: **0**
- Self references: **0**
- Cross-category relations requiring semantic interpretation: **24**

### Structural problems

- No structural related-product problems.

Cross-category links were not automatically classified as errors because plumbing, electrical, finishing and mounting systems legitimately cross category boundaries. Manual spot-check found no obvious unrelated pair that blocks launch.

## 6. Image audit

### imageStatus values

- planned: **13**
- needs-real-photo: **166**

- Displayed local WebP files: **21**
- Displayed placeholders: **90**
- Approved real/ready/has-real-photo status: **0**
- Products still requiring photo approval by status: **179**
- Missing image entries: **0**
- Missing primary local image paths: **68**
- Missing primary paths with a usable fallback: **68**
- Broken fallback paths: **0**

The missing primary paths do not currently produce empty cards because all 68 have usable fallbacks. They still represent unfinished photo mappings. The physical asset count and `imageStatus` are intentionally reported separately: a local WebP is only a potential product image and is not approved while the product remains `planned` or `needs-real-photo`.

### Suspicious packshots / mismatched product visuals

- **high** — `gidroizolyaciya-smes-20kg`: Local WebP shows Remmers MB 1K rapid 25 kg, while catalog item is a generic/HydroPro 20 kg product.
- **high** — `cementtuu-shtukaturka-25kg`: Image source is the same Knauf gypsum-plaster bag used for another product; it does not represent StroyMix cement plaster.
- **medium** — `gips-shtukaturkasy-30kg`: Supplier packshot visibly carries Knauf packaging while the catalog product brand is StroyMix.
- **medium** — `gruntovka-tereng-singuu-10l`: Source is a Rockwool-branded primer packshot while the catalog product uses another generic catalog brand.
- **medium** — `portlandcement-m500-50kg`: Source is a foreign white-cement packshot; catalog title/brand describes generic Portland cement M500.
- **high** — `pvs-provod-3x1-5`: Uses the same source image as VVGng 3x2.5 cable, so conductor type and marking may be wrong.
- **medium** — `drel-650w-udarnyi`: Uses the same generic “drill inside” image as the perforator; product identity and configuration are not buyer-verifiable.
- **medium** — `perforator-800w`: Uses a generic internal drill photo rather than a clear 800 W perforator packshot.

The previously reported Remmers image is confirmed as suspicious: it visibly shows **Remmers MB 1K rapid, 25 kg**, while the catalog item is **20 kg** and uses a different catalog identity. Stage 15 reports it but does not modify the image.

### High-priority list for the next photo audit

- `gidroizolyaciya-smes-20kg`
- `cementtuu-shtukaturka-25kg`
- `gips-shtukaturkasy-30kg`
- `gruntovka-tereng-singuu-10l`
- `portlandcement-m500-50kg`
- `pvs-provod-3x1-5`
- `drel-650w-udarnyi`
- `perforator-800w`
- `kanalizatsiya-truba-50mm`
- `kanalizatsiya-truba-110mm`
- `kanalizatsiya-ugolok-50mm-45`
- `kanalizatsiya-troynik-110-50mm`
- `ashkana-smesiteli-basic`
- `vanna-smesiteli-dush-komplekti`
- `akkumulyatorduk-shurupovert-12v`
- `molotok-500g`
- `knauf-rotband-30kg`
- `knauf-mp-75-30kg`
- `kabel-vvgng-3x2-5`
- `rozetka-ichki-montazh-ak`
- `avtomat-16a-1p`
- `unitaz-kompakt-ak-standart`
- `rakovina-keramika-50sm`
- `sifon-botolko-40mm`
- `gibkaya-podvodka-60sm-12`
- `sharovyi-kran-latun-12`
- `alyuminii-radiator-500mm-sekciya`
- `radiator-termostatikalyk-bash`

## 7. SEO audit

- Empty SEO title/meta fields: **0** (covered by required-field audit).
- Duplicate KG SEO titles: **0**
- Duplicate RU SEO titles: **0**
- KG SEO descriptions shorter than 80 characters: **1**
- RU SEO descriptions shorter than 80 characters: **8**
- Weak aliases (fewer than 2 in KG or RU): **0**

### Short SEO descriptions

- KG `ppr-tutuk-keskich` (77 chars)
- RU `molotok-500g` (76 chars)
- RU `aerator-smesitelya-m24` (70 chars)
- RU `bolgarka-125mm` (78 chars)
- RU `uroven-60sm` (76 chars)
- RU `shpatel-100mm` (77 chars)
- RU `bur-sds-plus-6mm` (79 chars)
- RU `kist-50mm` (79 chars)
- RU `tuz-podves` (79 chars)

Short descriptions are minor editorial improvements, not blockers: they are product-specific and not empty/template text.

## 8. Safety and honesty audit

### Electrical and warm floor

- Products checked: **35**
- Products without an explicit electrician/specialist marker: **0**
- Dangerous bypass/live-work claims: **0**

- All electrical/warm-floor products include an electrician or specialist safety marker.

### Tools

- Products checked: **15**
- Products without a general instruction/protection/safety marker: **0**

- All tool products include safety/instruction/protection wording.

### Fasteners, construction materials, paints and adhesives

- Products checked: **63**
- Products without a manufacturer/depends/confirm qualifier: **0**
- Risky absolute promises detected: **0**

- All checked products contain cautious manufacturer/object-dependent wording.

No unsafe chemical recipes, protection bypass guidance, universal load promises or absolute moisture/strength guarantees were detected.

## 9. Command results

Final results:

- `npm.cmd run validate:catalog` — **passed**, 0 warnings
- `npm.cmd run generate:sitemap` — **passed**, 343 URLs, 0 warnings
- `npm.cmd run lint` — **passed**
- `npm.cmd run build` — **passed**; non-blocking bundle-size warning remains
- `git diff --check` — **passed**
- Existing image checklist: `node scripts/high-priority-webp-checklist.mjs` — **passed**, 58 high-priority products, 0 mapping issues

The generated legacy checklist file is not part of the Stage 15 commit.

## 10. Blockers and recommended next stage

### Content blockers

- Deep commercial fields are present for **179/179** products.
- Related-product structure has no broken IDs, duplicates or self references.
- **Language cleanup remains:** 46 high-confidence field-level issues across 43 products, mainly Russian specification keys inside KG objects and inherited KG specification fragments inside RU objects.
- No technical garbage or demo/template text was detected.

The language issues do not prevent a dedicated photo audit, but the catalog should not be called fully localized until they are corrected and re-audited.

### Remaining launch risk

- Image readiness is not complete: **90** products display placeholders and **0** products carry an approved ready/real status.
- At least **8** local visuals require priority manual verification because the visible brand, product type or package may not match catalog data.

### Recommended next stage

Proceed to a dedicated **photo audit and approved-image replacement plan**:

1. Verify the 21 local WebPs against product title, brand, model and package.
2. Replace or suppress confirmed mismatches, beginning with high-severity items.
3. Prepare owned or supplier-approved photos for the 90 displayed placeholders.
4. Promote `imageStatus` to a ready/real value only after visual and rights verification.
5. After image readiness, run **Kurulush gap analysis**. CRM/Admin should remain a separate later scope.
