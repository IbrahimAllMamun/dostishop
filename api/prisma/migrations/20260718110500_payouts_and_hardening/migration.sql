-- AlterTable: checkout idempotency guard
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- AlterTable: link sub-orders to vendor payouts
ALTER TABLE "SubOrder" ADD COLUMN "payoutId" TEXT;

-- CreateIndex
CREATE INDEX "SubOrder_payoutId_idx" ON "SubOrder"("payoutId");

-- AddForeignKey
ALTER TABLE "SubOrder" ADD CONSTRAINT "SubOrder_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
