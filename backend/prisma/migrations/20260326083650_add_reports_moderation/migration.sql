-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "actionTaken" VARCHAR(40),
ADD COLUMN     "moderatorNote" VARCHAR(255),
ADD COLUMN     "resolvedAt" TIMESTAMP(6),
ADD COLUMN     "resolvedByUserId" UUID;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false;
