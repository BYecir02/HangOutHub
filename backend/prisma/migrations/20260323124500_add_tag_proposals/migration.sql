ALTER TABLE "Tag"
ADD COLUMN "status" VARCHAR(16) NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "submittedByUserId" UUID;

CREATE INDEX "Tag_categoryId_status_idx" ON "Tag"("categoryId", "status");
CREATE INDEX "Tag_submittedByUserId_idx" ON "Tag"("submittedByUserId");
