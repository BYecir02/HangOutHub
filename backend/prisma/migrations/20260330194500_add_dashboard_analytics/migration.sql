ALTER TABLE "Place"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Place"
SET "createdAt" = COALESCE("updatedAt", "createdAt");

CREATE TABLE IF NOT EXISTS "PostShareEvent" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "postId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostShareEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PostShareEvent_postId_createdAt_idx"
  ON "PostShareEvent" ("postId", "createdAt");

CREATE INDEX IF NOT EXISTS "PostShareEvent_userId_createdAt_idx"
  ON "PostShareEvent" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "PostShareEvent_createdAt_idx"
  ON "PostShareEvent" ("createdAt");

ALTER TABLE "PostShareEvent"
ADD CONSTRAINT "PostShareEvent_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "PostShareEvent"
ADD CONSTRAINT "PostShareEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
