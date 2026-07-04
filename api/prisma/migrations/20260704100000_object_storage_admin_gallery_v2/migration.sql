ALTER TABLE "ProductImage"
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "storageDriver" TEXT NOT NULL DEFAULT 'legacy',
ADD COLUMN "originalName" TEXT,
ADD COLUMN "size" INTEGER,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "ProductImage_storageKey_idx" ON "ProductImage"("storageKey");
