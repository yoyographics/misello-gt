-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "billingAddress" JSONB,
ADD COLUMN     "deliveryAddress" JSONB;
