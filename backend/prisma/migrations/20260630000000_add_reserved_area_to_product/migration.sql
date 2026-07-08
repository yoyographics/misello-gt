-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "hasReservedArea" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "reservedWidthMm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "reservedHeightMm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "reservedPositionX" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "reservedPositionY" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "reservedStroke" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "reservedStrokeWidth" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
