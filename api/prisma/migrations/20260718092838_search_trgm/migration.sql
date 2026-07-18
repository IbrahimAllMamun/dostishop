-- CreateTable
CREATE TABLE "SearchQuery" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "results" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchQuery_term_idx" ON "SearchQuery"("term");

-- Typo-tolerant search: trigram extension + GIN indexes on product name/brand
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Product_name_trgm_idx" ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Product_brand_trgm_idx" ON "Product" USING GIN ("brand" gin_trgm_ops);
