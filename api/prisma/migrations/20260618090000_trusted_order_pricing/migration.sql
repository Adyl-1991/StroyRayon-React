-- CreateEnum
CREATE TYPE "OrderItemStockCheckStatus" AS ENUM ('OK', 'NEEDS_CONFIRMATION', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "availabilityCheckRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderItem"
ADD COLUMN "productSlugSnapshot" TEXT NOT NULL DEFAULT '',
ADD COLUMN "productUnitSnapshot" TEXT NOT NULL DEFAULT '',
ADD COLUMN "stockCheckStatus" "OrderItemStockCheckStatus" NOT NULL DEFAULT 'NEEDS_CONFIRMATION';
