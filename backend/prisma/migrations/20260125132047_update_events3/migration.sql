-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
