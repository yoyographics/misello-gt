-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showInWizard" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- Insert fixed categories with deterministic UUIDs
INSERT INTO "Category" ("id", "name", "slug", "showInWizard", "sortOrder", "updatedAt") VALUES
('944b5e6c-6561-50c1-8e57-94adf3c20c2c', 'Sellos Automáticos', 'sello-automatico', true, 1, CURRENT_TIMESTAMP),
('fb89f312-f091-5141-9a4e-a19ba909cdc2', 'Fechadores', 'sello-fechador', true, 2, CURRENT_TIMESTAMP),
('41423acc-3778-56c5-9898-b9e99ab42793', 'Sellos Portátiles', 'sello-portatil', true, 3, CURRENT_TIMESTAMP),
('0d1f2f70-915e-574b-9ac5-5cc412dfc1bb', 'Sellos de Madera', 'sello-madera', true, 4, CURRENT_TIMESTAMP),
('cb91075c-f6a7-5aa0-b854-710e3bbc5e09', 'Embosadoras', 'embosadora', true, 5, CURRENT_TIMESTAMP),
('e4437137-fea8-525d-9147-9343232c4fd8', 'Almohadillas', 'almohadillas', false, 6, CURRENT_TIMESTAMP),
('57865651-4bcf-5781-944f-61422579cae2', 'Tintas', 'tintas', false, 7, CURRENT_TIMESTAMP);

-- AlterTable: add categoryId to Product
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

-- Migrate existing products: map enum values to new category UUIDs
UPDATE "Product" SET "categoryId" = '944b5e6c-6561-50c1-8e57-94adf3c20c2c' WHERE "category" = 'MONTURA_AUTOMATICA';
UPDATE "Product" SET "categoryId" = 'fb89f312-f091-5141-9a4e-a19ba909cdc2' WHERE "category" = 'FECHADOR';
UPDATE "Product" SET "categoryId" = '41423acc-3778-56c5-9898-b9e99ab42793' WHERE "category" = 'PORTATIL';
UPDATE "Product" SET "categoryId" = '0d1f2f70-915e-574b-9ac5-5cc412dfc1bb' WHERE "category" = 'MADERA';
UPDATE "Product" SET "categoryId" = 'cb91075c-f6a7-5aa0-b854-710e3bbc5e09' WHERE "category" = 'EMBOSADORA';
UPDATE "Product" SET "categoryId" = 'e4437137-fea8-525d-9147-9343232c4fd8' WHERE "category" = 'ALMOHADILLA_AUTOMATICA';
UPDATE "Product" SET "categoryId" = 'e4437137-fea8-525d-9147-9343232c4fd8' WHERE "category" = 'ALMOHADILLA_MADERA';
UPDATE "Product" SET "categoryId" = '57865651-4bcf-5781-944f-61422579cae2' WHERE "category" = 'TINTA';

-- Make categoryId required
ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropColumn: remove old enum column
ALTER TABLE "Product" DROP COLUMN "category";

-- DropEnum
DROP TYPE "ProductCategory";

-- AlterTable: add salesCount to Product
ALTER TABLE "Product" ADD COLUMN "salesCount" INTEGER NOT NULL DEFAULT 0;
