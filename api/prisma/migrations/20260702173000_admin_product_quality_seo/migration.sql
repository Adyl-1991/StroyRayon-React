-- Stage 40C: add Russian product SEO fields for admin create/edit parity.
ALTER TABLE "Product"
  ADD COLUMN "seoTitleRu" TEXT,
  ADD COLUMN "seoDescriptionRu" TEXT;
