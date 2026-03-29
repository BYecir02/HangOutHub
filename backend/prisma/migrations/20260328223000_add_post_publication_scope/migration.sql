-- Add publication scope to posts
ALTER TABLE "Post" ADD COLUMN "publicationScope" VARCHAR(20) NOT NULL DEFAULT 'personal';
