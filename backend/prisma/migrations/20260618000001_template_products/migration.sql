-- DropIndex
DROP INDEX IF EXISTS "Template_categoryId_productShape_widthMm_heightMm_idx";

-- AlterTable: remove shape/dimension columns
ALTER TABLE "Template" DROP COLUMN IF EXISTS "productShape";
ALTER TABLE "Template" DROP COLUMN IF EXISTS "widthMm";
ALTER TABLE "Template" DROP COLUMN IF EXISTS "heightMm";

-- CreateTable
CREATE TABLE "TemplateProduct" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateProduct_templateId_productId_key" ON "TemplateProduct"("templateId", "productId");

-- CreateIndex
CREATE INDEX "TemplateProduct_productId_idx" ON "TemplateProduct"("productId");

-- AddForeignKey
ALTER TABLE "TemplateProduct" ADD CONSTRAINT "TemplateProduct_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateProduct" ADD CONSTRAINT "TemplateProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
