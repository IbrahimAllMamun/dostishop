-- Colour registry, attribute kind/scope, and the per-product attribute joins.
-- Entirely additive: every new column carries a default, and the backfills at
-- the bottom reconstruct state that until now was implied by the data.

-- CreateEnum
CREATE TYPE "AttributeKind" AS ENUM ('TEXT', 'COLOR');

-- AlterTable
ALTER TABLE "Attribute"
  ADD COLUMN "kind" "AttributeKind" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN "isVariant" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hexCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "adminLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");
CREATE INDEX "Color_createdById_idx" ON "Color"("createdById");

-- AlterTable
ALTER TABLE "AttributeValue" ADD COLUMN "colorId" TEXT;

-- CreateIndex
CREATE INDEX "AttributeValue_colorId_idx" ON "AttributeValue"("colorId");

-- AddForeignKey
ALTER TABLE "AttributeValue" ADD CONSTRAINT "AttributeValue_colorId_fkey"
  FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("productId","attributeId")
);

-- CreateIndex
CREATE INDEX "ProductAttribute_attributeId_idx" ON "ProductAttribute"("attributeId");

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_attributeId_fkey"
  FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "productId" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("productId","valueId")
);

-- CreateIndex
CREATE INDEX "ProductAttributeValue_valueId_idx" ON "ProductAttributeValue"("valueId");

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_valueId_fkey"
  FOREIGN KEY ("valueId") REFERENCES "AttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill 1: promote the existing Colour attribute's values into the registry.
-- Hexes are supplied for the names actually in use plus the ones most likely to
-- be typed next; anything unrecognised lands on a neutral grey that an admin can
-- correct in the UI, which is better than refusing to migrate.
-- ---------------------------------------------------------------------------
INSERT INTO "Color" ("id", "name", "hexCode", "sortOrder", "createdAt", "updatedAt")
SELECT
    'clr_' || replace(lower(av."value"), ' ', '-'),
    av."value",
    CASE lower(av."value")
        WHEN 'black'  THEN '#1a1a1a'
        WHEN 'white'  THEN '#f5f3ef'
        WHEN 'navy'   THEN '#1b2a4a'
        WHEN 'blue'   THEN '#2563a8'
        WHEN 'brown'  THEN '#6b4423'
        WHEN 'tan'    THEN '#b98d5f'
        WHEN 'maroon' THEN '#6e1f2e'
        WHEN 'red'    THEN '#b3202e'
        WHEN 'pink'   THEN '#d98ba3'
        WHEN 'green'  THEN '#2f7d54'
        WHEN 'olive'  THEN '#6b6b33'
        WHEN 'grey'   THEN '#8a8a8a'
        WHEN 'gray'   THEN '#8a8a8a'
        WHEN 'beige'  THEN '#d9cbb4'
        WHEN 'cream'  THEN '#efe6d4'
        WHEN 'gold'   THEN '#b8791f'
        WHEN 'silver' THEN '#b9bcc0'
        WHEN 'purple' THEN '#6d4c9f'
        WHEN 'yellow' THEN '#d7a021'
        WHEN 'orange' THEN '#c0562b'
        ELSE '#b7b7b7'
    END,
    av."sortOrder",
    NOW(),
    NOW()
FROM "AttributeValue" av
JOIN "Attribute" a ON a."id" = av."attributeId"
WHERE a."slug" = 'color'
ON CONFLICT ("name") DO NOTHING;

-- Point the Colour attribute's values at their new registry rows
UPDATE "AttributeValue" av
SET "colorId" = c."id"
FROM "Color" c, "Attribute" a
WHERE a."id" = av."attributeId"
  AND a."slug" = 'color'
  AND c."name" = av."value";

-- Mark the attribute itself so the UI renders swatches rather than text
UPDATE "Attribute" SET "kind" = 'COLOR' WHERE "slug" = 'color';

-- ---------------------------------------------------------------------------
-- Backfill 2: a product's attribute set was until now implied by whichever
-- values its variants happened to carry. Make that explicit so existing
-- products open in the new form with the right axes already ticked.
-- ---------------------------------------------------------------------------
INSERT INTO "ProductAttribute" ("productId", "attributeId", "sortOrder")
SELECT DISTINCT pv."productId", av."attributeId", a."sortOrder"
FROM "VariantAttribute" va
JOIN "ProductVariant" pv ON pv."id" = va."variantId"
JOIN "AttributeValue" av ON av."id" = va."valueId"
JOIN "Attribute" a ON a."id" = av."attributeId"
ON CONFLICT DO NOTHING;
