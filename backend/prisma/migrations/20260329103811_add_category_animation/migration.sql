-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "animationUrl" VARCHAR(255);

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "publicationScope" DROP NOT NULL;
