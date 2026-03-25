-- Add custom visibility recipients list for posts
ALTER TABLE "Post"
ADD COLUMN "visibilityUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "Post_visibilityUserIds_idx"
ON "Post"
USING GIN ("visibilityUserIds");
