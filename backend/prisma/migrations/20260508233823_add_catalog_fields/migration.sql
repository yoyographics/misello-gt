/*
  Warnings:

  - Added the required column `updatedAt` to the `Font` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Font" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT;
