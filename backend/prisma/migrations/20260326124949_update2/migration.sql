-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "deletedAt" TIMESTAMP(6),
ADD COLUMN     "editedAt" TIMESTAMP(6),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
