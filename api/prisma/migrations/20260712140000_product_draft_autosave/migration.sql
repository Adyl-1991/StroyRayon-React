CREATE TABLE "ProductDraft" (
    "productId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "baseProductUpdatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDraft_pkey" PRIMARY KEY ("productId")
);

CREATE INDEX "ProductDraft_updatedById_idx" ON "ProductDraft"("updatedById");
CREATE INDEX "ProductDraft_updatedAt_idx" ON "ProductDraft"("updatedAt");

ALTER TABLE "ProductDraft" ADD CONSTRAINT "ProductDraft_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductDraft" ADD CONSTRAINT "ProductDraft_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
