-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "defaultFontId" TEXT;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_defaultFontId_fkey" FOREIGN KEY ("defaultFontId") REFERENCES "Font"("id") ON DELETE SET NULL ON UPDATE CASCADE;
