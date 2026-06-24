# Stage 33 - Mobile Visual Polish Pass

## 1. Summary

Stage 33 tightened the storefront mobile and tablet UX without changing backend, Render, PostgreSQL, Vercel environment settings, product data, product images, or the static WhatsApp fallback.

The pass focused on small layout fixes in the mobile shell and buyer surfaces:

- safer mobile header search sizing;
- clearer bottom mobile navigation and cart badge;
- denser but cleaner mobile product cards;
- less cramped search filters on narrow screens;
- cleaner product variant/action layout;
- less excessive cart and checkout bottom spacing;
- safer mobile sticky product CTA above the bottom nav.

## 2. Audit source files reviewed

- `reports/production-audit/stroyrayon-roadmap-from-constitution.md`
- `reports/visual-audit/storefront-visual-mobile-roadmap.md`
- `reports/stage32-customer-like-e2e-qa.md`
- `api/README.md`

## 3. Mobile issues fixed

- Mobile product cards were visually heavy at 360/390 px. Cards now keep the important buyer data visible and suppress lower-priority card text on very small screens.
- Mobile cart and checkout pages had overly large bottom spacing around fixed navigation. Spacing is now reduced while keeping bottom nav and sticky CTA clearance.
- Mobile search filter headers and active chips now handle long KG/RU labels more safely.
- Mobile header search no longer relies on viewport-left positioning for the submit button.

## 4. Header fixes

- Mobile search now uses full available header width.
- Search submit button is anchored with `right` inside the form instead of viewport-based `left` calculations.
- Narrow 360 px search sizing keeps the button inside the input area.

## 5. MobileNav fixes

- Added a dedicated cart badge element instead of appending the count to the label text.
- Added safe-area bottom padding for iOS/Android devices.
- Reduced label size and constrained label overflow.
- Active state now has a subtle background as well as color/weight.

## 6. ProductCard fixes

- At 420 px and below, product cards keep a two-column grid but become compact.
- Product images use smaller stable heights.
- Product titles clamp to three lines.
- Secondary badges, descriptions, rating text, variant summary, and WhatsApp text link are hidden on the smallest cards to reduce scan noise.
- Price/unit and CTA buttons are sized to fit narrow cards.

## 7. SearchPage fixes

- Mobile filters now avoid overflowing long labels.
- Filter body uses one column on small phones, with price fields still paired.
- Active filter chips wrap safely.
- Sticky filter actions remain inside the filter panel.

## 8. ProductPage fixes

- Product action buttons become full-width on mobile.
- Variant buttons use two compact columns on mobile.
- Sticky product CTA sits above the bottom nav with safe-area-aware clearance.
- Sticky CTA action width is viewport-relative instead of a fixed wide column.

## 9. CartPage fixes

- Mobile cart items use a slightly smaller image column and tighter spacing.
- Quantity, total, and remove actions remain touch-friendly while fitting the 360/390 px layout.
- Cart summary bottom spacing is reduced so the page feels less blocked by fixed navigation.

## 10. CheckoutPage fixes

- Checkout labels use grid spacing for better mobile readability.
- Submit/reopen WhatsApp buttons are full-width on mobile.
- Order preview no longer gets pushed down by an extra fixed-nav-sized top margin.
- Checkout summary spacing was reduced while preserving bottom nav clearance.

## 11. Routes checked

Automated checks covered:

- `/`
- `/catalog`
- `/catalog/kurulush`
- `/catalog/inzhenerdik-santehnika`
- `/catalog/inzhenerdik-santehnika/otoplenie/suu-teplyi-pol`
- `/catalog/santehnika`
- `/catalog/elektrika`
- `/catalog/elektrika/elektr-teplyi-pol`
- `/catalog/shaimandar`
- `/catalog/bekitkich`
- `/catalog/boiok-tush-kagaz`
- `/catalog/ventilyaciya`
- `/catalog/bak-koroo`
- `/cart`
- `/checkout`
- search flows through the real header search form
- admin separation in `qa:stage31`: `/admin/login`, `/admin/orders`, `/admin/products`

## 12. Viewports checked

- `360`
- `390`
- `430` through `qa:stage31`
- `768`
- `1024`
- `1366`
- `1440` through `qa:stage31`
- `1707` through `qa:stage31`

## 13. KG/RU regression result

Passed.

`npm.cmd run qa:stage31` result:

- checks: `400`
- routes: `25`
- locales: `kg`, `ru`
- issues: `0`

## 14. Customer QA result

Passed after running with elevated process permissions so the script could launch and connect to the local headless Chrome debugging port.

`npm.cmd run qa:customer` result:

- mode: `production-preview`
- checks: `1762`
- failed checks: `0`
- locales: `kg`, `ru`
- viewports: `360`, `390`, `768`, `1024`, `1366`
- console errors: `0`
- failed assets: `0`
- issues: `0`

Earlier sandboxed attempts either hung in Chrome/CDP or timed out waiting for `/json/version`; those were infrastructure launch failures, not storefront assertion failures.

## 15. Remaining visual issues

- Full visual screenshot review can still be expanded for manual 430/1440 comparison.
- Product image coverage remains a separate production-content task.
- Larger storefront design polish, footer hierarchy, and service-page differentiation remain future non-blocking improvements.
- The Vite large JavaScript chunk warning remains unchanged.

## 16. Backend/Render blocked issues

Production backend, Render, PostgreSQL, and Vercel API environment work was intentionally not touched.

Live production order persistence, production stock reservation, production admin order visibility, and production backend buyer/admin E2E remain blocked until the production backend infrastructure is fully connected.

## 17. Commands run

- `git status --short`
- `git log -1 --oneline`
- `git diff --stat`
- `git diff --check`
- `npm.cmd run validate:catalog` - passed, 0 warnings
- `npm.cmd run generate:sitemap` - passed, 341 URLs, 0 warnings
- `npm.cmd run lint` - passed
- `npm.cmd run build` - passed with existing large chunk warning
- `npm.cmd run qa:stage31` - passed, 400 checks, 0 issues
- `npm.cmd run qa:customer` - passed with elevated process permissions, 1762 checks, 0 issues
- `cd api && npm.cmd test` - passed, 29/29
- `cd api && npx.cmd prisma validate` - passed
- `git diff --check -- src/components/layout/MobileNav.jsx src/styles/global.css` - passed

## 18. Files changed

- `src/components/layout/MobileNav.jsx`
- `src/styles/global.css`
- `reports/stage33-mobile-visual-polish.md`

## 19. Safety check

- No `.env` file was changed or staged.
- No secret, token, database URL, password, or production environment value was added.
- No backend, Render, PostgreSQL, Vercel, or product image file was changed.
- No old screenshots, visual audit screenshots, videos, temp files, `node_modules`, or build output are intended for commit.
- Existing unrelated dirty reports/screenshots remain unstaged and outside the Stage 33 commit.
