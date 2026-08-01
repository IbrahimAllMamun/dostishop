-- Append-only status history for sub-orders.
--
-- Additive: SubOrder.status stays the current value and nothing reads
-- differently until the new endpoints ship. Rolls back by dropping the table.

-- CreateTable
CREATE TABLE "SubOrderEvent" (
    "id" TEXT NOT NULL,
    "subOrderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubOrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubOrderEvent_subOrderId_createdAt_idx" ON "SubOrderEvent"("subOrderId", "createdAt");

-- AddForeignKey
ALTER TABLE "SubOrderEvent" ADD CONSTRAINT "SubOrderEvent_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "SubOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill. Existing sub-orders have no history, only a current status, so we
-- can honestly reconstruct exactly two points:
--   * PENDING at createdAt — every sub-order starts there (schema default).
--   * the current status at updatedAt, when it differs from PENDING.
-- Intermediate transitions were never recorded and are NOT invented.
-- ---------------------------------------------------------------------------

INSERT INTO "SubOrderEvent" ("id", "subOrderId", "status", "note", "createdById", "createdAt")
SELECT md5('placed:' || so."id"), so."id", 'PENDING', 'Order placed', NULL, so."createdAt"
FROM "SubOrder" so
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "SubOrderEvent" ("id", "subOrderId", "status", "note", "createdById", "createdAt")
SELECT
  md5('current:' || so."id"),
  so."id",
  so."status",
  'Status recorded before history was kept',
  NULL,
  -- Guard against a clock skew making the second event precede the first
  GREATEST(so."updatedAt", so."createdAt")
FROM "SubOrder" so
WHERE so."status" <> 'PENDING'
ON CONFLICT ("id") DO NOTHING;
