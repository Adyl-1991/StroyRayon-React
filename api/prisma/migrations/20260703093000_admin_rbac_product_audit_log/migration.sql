-- Stage 40D: admin safety roles and product audit history.
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'VIEWER';

CREATE TABLE "ProductAuditLog" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "adminId" TEXT,
  "action" TEXT NOT NULL,
  "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductAuditLog_productId_createdAt_idx" ON "ProductAuditLog"("productId", "createdAt");
CREATE INDEX "ProductAuditLog_adminId_createdAt_idx" ON "ProductAuditLog"("adminId", "createdAt");
CREATE INDEX "ProductAuditLog_action_idx" ON "ProductAuditLog"("action");

ALTER TABLE "ProductAuditLog"
  ADD CONSTRAINT "ProductAuditLog_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductAuditLog"
  ADD CONSTRAINT "ProductAuditLog_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
