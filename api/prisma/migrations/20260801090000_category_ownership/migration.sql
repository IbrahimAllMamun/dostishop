-- Category ownership: a vendor may edit/delete only the categories they created,
-- and loses that right permanently once a SUPER_ADMIN curates the category.
ALTER TABLE "Category" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Category" ADD COLUMN "adminLocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Category_createdById_idx" ON "Category"("createdById");
