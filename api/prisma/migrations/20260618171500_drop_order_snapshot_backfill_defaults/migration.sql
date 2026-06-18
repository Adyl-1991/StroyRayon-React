-- Defaults were used only to backfill existing order rows safely.
ALTER TABLE "OrderItem"
ALTER COLUMN "productSlugSnapshot" DROP DEFAULT,
ALTER COLUMN "productUnitSnapshot" DROP DEFAULT;
