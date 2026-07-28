UPDATE "Product"
SET
  "isActive" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN (
  'start-shpaklevka-20kg',
  'alinex-stukaturka-gipsovaia-usilennaia-alinex-grender-wp'
);
