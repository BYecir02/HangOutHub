/*
  Warnings:

  - You are about to drop the column `iconUrl` on the `Category` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "iconUrl",
ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#4c669f',
ADD COLUMN     "icon" TEXT NOT NULL DEFAULT 'help-outline';
