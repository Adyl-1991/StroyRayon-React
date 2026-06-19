ALTER TYPE "OrderStatus" RENAME VALUE 'PROCESSING' TO 'ASSEMBLING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_CONFIRMATION' AFTER 'NEW';

ALTER TABLE "Order" ADD COLUMN "adminNote" TEXT;

CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx"
ON "OrderStatusHistory"("orderId", "createdAt");

CREATE INDEX "OrderStatusHistory_adminUserId_idx"
ON "OrderStatusHistory"("adminUserId");

ALTER TABLE "OrderStatusHistory"
ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderStatusHistory"
ADD CONSTRAINT "OrderStatusHistory_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
