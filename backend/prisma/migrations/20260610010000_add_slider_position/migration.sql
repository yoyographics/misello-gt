-- CreateEnum
CREATE TYPE "SliderPosition" AS ENUM ('HOME', 'STORE_LEFT', 'STORE_RIGHT');

-- AlterTable
ALTER TABLE "SliderImage" ADD COLUMN "position" "SliderPosition" NOT NULL DEFAULT 'HOME';
