-- CreateTable
CREATE TABLE "SliderImage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL DEFAULT 'Crear mi sello',
    "buttonLink" TEXT NOT NULL DEFAULT '/design',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SliderImage_pkey" PRIMARY KEY ("id")
);
