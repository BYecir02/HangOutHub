-- Add plan-oriented fields to posts
ALTER TABLE "Post" ADD COLUMN "postType" VARCHAR(20) DEFAULT 'post';
ALTER TABLE "Post" ADD COLUMN "placeName" VARCHAR(120);
ALTER TABLE "Post" ADD COLUMN "cityName" VARCHAR(120);
ALTER TABLE "Post" ADD COLUMN "ambiance" VARCHAR(50);
UPDATE "Post" SET "postType" = 'post' WHERE "postType" IS NULL;
