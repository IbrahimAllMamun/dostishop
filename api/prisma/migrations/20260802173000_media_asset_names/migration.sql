-- The previous migration named each asset after the last path segment of its
-- URL. That is right for uploaded files (`/uploads/1699-a3f2.jpg`) but useless
-- for the seeded catalogue, whose URLs end `/600/600` — every asset came out
-- called "600".
--
-- Name those after whatever references them instead, which is what a vendor
-- scanning the grid actually needs. Only rows whose name has no file extension
-- are touched, so a real uploaded filename is never overwritten.

-- Product images take the name of their product. DISTINCT ON keeps one row per
-- (shop, url) pair when several products share a file, preferring the image
-- that sorts first on its product.
UPDATE "MediaAsset" m
SET "name" = sub.product_name
FROM (
    SELECT DISTINCT ON (p."shopId", pi."url")
        p."shopId" AS shop_id,
        pi."url"   AS url,
        p."name"   AS product_name
    FROM "ProductImage" pi
    JOIN "Product" p ON p."id" = pi."productId"
    ORDER BY p."shopId", pi."url", pi."sortOrder", p."name"
) sub
WHERE m."shopId" = sub.shop_id
  AND m."url" = sub.url
  AND m."name" !~ '\.[A-Za-z0-9]{2,5}$';

-- Shop logos and banners say what they are
UPDATE "MediaAsset" m
SET "name" = s."name" || ' — logo'
FROM "Shop" s
WHERE m."shopId" = s."id"
  AND m."url" = s."logoUrl"
  AND m."name" !~ '\.[A-Za-z0-9]{2,5}$';

UPDATE "MediaAsset" m
SET "name" = s."name" || ' — banner'
FROM "Shop" s
WHERE m."shopId" = s."id"
  AND m."url" = s."bannerUrl"
  AND m."name" !~ '\.[A-Za-z0-9]{2,5}$';
