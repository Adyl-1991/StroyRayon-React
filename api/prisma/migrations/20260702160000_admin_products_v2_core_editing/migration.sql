-- CreateEnum
CREATE TYPE "ProductDocumentType" AS ENUM ('CERTIFICATE', 'MANUAL', 'PASSPORT', 'OTHER');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "descriptionRu" TEXT;

-- Backfill Russian descriptions previously stored inside Product.specs.
UPDATE "Product"
SET "descriptionRu" = "specs"->>'descriptionRu'
WHERE "descriptionRu" IS NULL
  AND jsonb_typeof("specs") = 'object'
  AND "specs" ? 'descriptionRu'
  AND NULLIF(TRIM("specs"->>'descriptionRu'), '') IS NOT NULL;

-- Keep specs focused on product characteristics after backfill.
UPDATE "Product"
SET "specs" = NULLIF("specs" - 'descriptionRu', '{}'::jsonb)
WHERE jsonb_typeof("specs") = 'object'
  AND "specs" ? 'descriptionRu';

-- CreateTable
CREATE TABLE "ProductDocument" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ProductDocumentType" NOT NULL DEFAULT 'OTHER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductDocument_productId_sortOrder_idx" ON "ProductDocument"("productId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
