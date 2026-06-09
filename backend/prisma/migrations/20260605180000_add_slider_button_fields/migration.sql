-- CreateEnum
CREATE TYPE "SliderButtonType" AS ENUM ('URL', 'CATEGORY', 'PRODUCT');

-- AlterTable
ALTER TABLE "SliderImage" ADD COLUMN     "gradient" TEXT,
ADD COLUMN     "animation" TEXT NOT NULL DEFAULT 'fade-up',
ADD COLUMN     "buttonType" "SliderButtonType" NOT NULL DEFAULT 'URL',
ADD COLUMN     "buttonUrl" TEXT,
ADD COLUMN     "buttonCategorySlug" TEXT,
ADD COLUMN     "buttonProductId" TEXT;

-- AlterTable: drop old buttonLink column (no longer in schema)
ALTER TABLE "SliderImage" DROP COLUMN "buttonLink";
