-- The media library. Additive: two new tables and a backfill that seeds them
-- from the images already referenced elsewhere, so no shop opens an empty
-- gallery on the day this ships.

-- CreateTable
CREATE TABLE "MediaFolder" (
    "id" TEXT NOT NULL,
    "shopId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaFolder_shopId_idx" ON "MediaFolder"("shopId");
CREATE UNIQUE INDEX "MediaFolder_shopId_name_key" ON "MediaFolder"("shopId", "name");

-- AddForeignKey
ALTER TABLE "MediaFolder" ADD CONSTRAINT "MediaFolder_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "shopId" TEXT,
    "folderId" TEXT,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAsset_shopId_idx" ON "MediaAsset"("shopId");
CREATE INDEX "MediaAsset_folderId_idx" ON "MediaAsset"("folderId");
CREATE UNIQUE INDEX "MediaAsset_shopId_url_key" ON "MediaAsset"("shopId", "url");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_folderId_fkey"
  FOREIGN KEY ("folderId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Backfill 1: every product image becomes a library asset for its shop.
-- The name is the last path segment of the URL, which is what the uploader
-- produced; vendors can rename afterwards. DISTINCT because two products may
-- legitimately share one file.
-- ---------------------------------------------------------------------------
INSERT INTO "MediaAsset" ("id", "shopId", "url", "name", "createdAt", "updatedAt")
SELECT
    'mda_' || md5(p."shopId" || '|' || pi."url"),
    p."shopId",
    pi."url",
    -- Strip any query string, then take the filename
    split_part(regexp_replace(pi."url", '\?.*$', ''), '/', -1),
    NOW(),
    NOW()
FROM "ProductImage" pi
JOIN "Product" p ON p."id" = pi."productId"
GROUP BY p."shopId", pi."url"
ON CONFLICT ("shopId", "url") DO NOTHING;

-- ---------------------------------------------------------------------------
-- Backfill 2: shop logos and banners, which are equally reusable.
-- ---------------------------------------------------------------------------
INSERT INTO "MediaAsset" ("id", "shopId", "url", "name", "createdAt", "updatedAt")
SELECT
    'mda_' || md5(s."id" || '|' || u.url),
    s."id",
    u.url,
    split_part(regexp_replace(u.url, '\?.*$', ''), '/', -1),
    NOW(),
    NOW()
FROM "Shop" s
CROSS JOIN LATERAL (VALUES (s."logoUrl"), (s."bannerUrl")) AS u(url)
WHERE u.url IS NOT NULL AND u.url <> ''
ON CONFLICT ("shopId", "url") DO NOTHING;
