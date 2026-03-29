-- AlterTable
ALTER TABLE "DirectMessage"
ADD COLUMN "replyToMessageId" UUID,
ADD COLUMN "sharedPostId" UUID;

-- CreateIndex
CREATE INDEX "DirectMessage_replyToMessageId_idx" ON "DirectMessage"("replyToMessageId");

-- CreateIndex
CREATE INDEX "DirectMessage_sharedPostId_idx" ON "DirectMessage"("sharedPostId");

-- AddForeignKey
ALTER TABLE "DirectMessage"
ADD CONSTRAINT "DirectMessage_replyToMessageId_fkey"
FOREIGN KEY ("replyToMessageId") REFERENCES "DirectMessage"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DirectMessage"
ADD CONSTRAINT "DirectMessage_sharedPostId_fkey"
FOREIGN KEY ("sharedPostId") REFERENCES "Post"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;
