# Catalog brand provenance

Brand names may be published only when at least one of these sources exists:

- an official manufacturer catalog;
- a supplier price list or import file;
- an explicit confirmation from the store owner.

Products without such evidence must have `brand: null`. The storefront omits
the brand filter and Product JSON-LD brand property for those products. Do not
publish `Без бренда` as a synthetic brand.

The approved brands and their provenance are defined in
`src/data/catalogBrandProvenance.js`. Any new, unapproved brand stops the
catalog build until its provenance is recorded.

`Safari` is owner-confirmed and remains published while the supplier price is
pending. On 2026-08-01, 156 products assigned to 48 unverified brand labels
were hidden from the storefront and public API. Their source records, IDs,
SKUs, slugs, prices, categories and image paths were kept for recovery after a
real supplier brand is confirmed.
