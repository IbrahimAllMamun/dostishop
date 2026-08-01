-- Normalised product attributes.
--
-- Purely additive: ProductVariant.size / .color are NOT dropped. They stay as
-- denormalised copies because checkout labels, CSV import/export and the
-- storefront facets still read them. The join table below becomes the source
-- of truth; those columns are kept in sync on write.

-- CreateTable
CREATE TABLE "Attribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "adminLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeValue" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantAttribute" (
    "variantId" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,

    CONSTRAINT "VariantAttribute_pkey" PRIMARY KEY ("variantId","valueId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_slug_key" ON "Attribute"("slug");
CREATE INDEX "Attribute_createdById_idx" ON "Attribute"("createdById");
CREATE INDEX "AttributeValue_attributeId_idx" ON "AttributeValue"("attributeId");
CREATE UNIQUE INDEX "AttributeValue_attributeId_value_key" ON "AttributeValue"("attributeId", "value");
CREATE INDEX "VariantAttribute_valueId_idx" ON "VariantAttribute"("valueId");

-- AddForeignKey
ALTER TABLE "AttributeValue" ADD CONSTRAINT "AttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VariantAttribute" ADD CONSTRAINT "VariantAttribute_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VariantAttribute" ADD CONSTRAINT "VariantAttribute_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "AttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill from the existing free-text columns.
-- Fixed ids so the platform-owned Size/Color attributes are stable across
-- environments and the seed can reference them. createdById stays NULL, which
-- means platform-owned: no vendor can edit or delete them.
-- ---------------------------------------------------------------------------

INSERT INTO "Attribute" ("id", "name", "slug", "sortOrder", "createdById", "adminLocked", "createdAt", "updatedAt")
VALUES
  ('attr_size',  'Size',  'size',  0, NULL, false, NOW(), NOW()),
  ('attr_color', 'Color', 'color', 1, NULL, false, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- Distinct non-empty sizes become values of the Size attribute
INSERT INTO "AttributeValue" ("id", "attributeId", "value", "sortOrder")
SELECT md5('size:' || v.size), 'attr_size', v.size, 0
FROM (
  SELECT DISTINCT btrim("size") AS size
  FROM "ProductVariant"
  WHERE "size" IS NOT NULL AND btrim("size") <> ''
) v
ON CONFLICT ("attributeId", "value") DO NOTHING;

INSERT INTO "AttributeValue" ("id", "attributeId", "value", "sortOrder")
SELECT md5('color:' || v.color), 'attr_color', v.color, 0
FROM (
  SELECT DISTINCT btrim("color") AS color
  FROM "ProductVariant"
  WHERE "color" IS NOT NULL AND btrim("color") <> ''
) v
ON CONFLICT ("attributeId", "value") DO NOTHING;

-- Link every existing variant to the values it already carries
INSERT INTO "VariantAttribute" ("variantId", "valueId")
SELECT pv."id", av."id"
FROM "ProductVariant" pv
JOIN "AttributeValue" av
  ON av."attributeId" = 'attr_size' AND av."value" = btrim(pv."size")
WHERE pv."size" IS NOT NULL AND btrim(pv."size") <> ''
ON CONFLICT DO NOTHING;

INSERT INTO "VariantAttribute" ("variantId", "valueId")
SELECT pv."id", av."id"
FROM "ProductVariant" pv
JOIN "AttributeValue" av
  ON av."attributeId" = 'attr_color' AND av."value" = btrim(pv."color")
WHERE pv."color" IS NOT NULL AND btrim(pv."color") <> ''
ON CONFLICT DO NOTHING;
