-- AlterTable
ALTER TABLE "OrderItem"
ADD COLUMN "reservedQuantity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OrderSequence" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSequence_pkey" PRIMARY KEY ("year")
);
