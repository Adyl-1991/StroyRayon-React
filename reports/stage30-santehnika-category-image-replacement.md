# Stage 30 — Santehnika Category Image Replacement

## 1. Summary

The root `/catalog` card for `Сантехника` now uses a purpose-built modern bathroom interior instead of a technical plumbing-parts image. The change is isolated to the category asset mapping and a new optimized image file.

## 2. Problem identified

The previous card image visually overlapped with the separate `Инженердик сантехника` category. It presented loose pipes, fittings, a valve, a hose and a faucet as the main subject rather than a finished sanitary interior.

## 3. Old image issue

- File: `public/images/categories/santehnika-realistic.jpg`
- Main emphasis: pipes, fittings and installation components
- Result: the card communicated engineering plumbing more strongly than bathroom fixtures

## 4. New image chosen

- File: `public/images/categories/santehnika-modern-bathroom.jpg`
- Format: optimized JPEG
- Dimensions: 1600 × 900
- Composition: light neutral modern bathroom with a sink and faucet, bathtub, walk-in shower, wall-hung toilet and visible linear shower drain
- Brand safety: no logos, labels, packaging, people or watermarks

## 5. Why the new image is better

The new image communicates the complete `Сантехника` category at first glance. It shows finished bathroom fixtures in a realistic retail context while remaining visually distinct from the technical pipe-and-fitting imagery used for `Инженердик сантехника`. The centered 16:9 composition preserves the important fixtures under responsive `object-fit: cover` cropping.

## 6. Files changed

- `src/data/categoryAssets.js`
  - Updated only the `santehnika` root-category image source and intrinsic dimensions.
- `public/images/categories/santehnika-modern-bathroom.jpg`
  - Added the new optimized category image.
- `reports/stage30-santehnika-category-image-replacement.md`
  - Added this Stage 30 implementation and QA report.

The old image remains in the repository but is no longer mapped to the `Сантехника` root card. No other category mapping was changed.

## 7. Routes checked

- `/catalog`

The category card loaded the new asset without broken images, horizontal overflow, runtime errors or public-layout regressions.

## 8. Viewports checked

- 360 × 800
- 390 × 844
- 768 × 1024
- 1366 × 900

Temporary full-page screenshots were written outside the repository under the operating system temp directory. They were not added to Git.

At all four widths:

- the bathroom is recognizable immediately;
- the sink, bathtub, shower and toilet remain legible;
- the crop stays balanced;
- card text and image composition remain aligned;
- the card remains consistent with the surrounding catalog grid.

The automated catalog smoke also covered 430, 1024 and 1440 widths and reported zero issues.

## 9. Final result

PASS. The `Сантехника` card now presents a clean, commercial modern bathroom visual instead of engineering plumbing parts. Other category assets, storefront layout and admin separation were not changed.

### Commands and results

- `npm.cmd run validate:catalog` — passed, 0 warnings
- `npm.cmd run generate:sitemap` — passed, 343 URLs, 0 warnings
- `npm.cmd run lint` — passed
- `npm.cmd run build` — passed
- `npm.cmd test` in `api` — passed, 29/29 tests
- `npx.cmd prisma validate` in `api` — passed
- `/catalog` headless browser QA — passed, 7 viewport checks, 0 issues
- `git diff --check` — run before commit
