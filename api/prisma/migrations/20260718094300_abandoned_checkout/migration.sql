-- CreateEnum
CREATE TYPE "AbandonedStatus" AS ENUM ('OPEN', 'RECOVERED', 'DISMISSED');

-- DropIndex
DROP INDEX "Product_brand_trgm_idx";

-- DropIndex
DROP INDEX "Product_name_trgm_idx";

-- CreateTable
CREATE TABLE "AbandonedCheckout" (
    "id" TEXT NOT NULL,
    "customerName" TEXT,
    "phone" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "status" "AbandonedStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbandonedCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbandonedCheckout_phone_status_idx" ON "AbandonedCheckout"("phone", "status");
