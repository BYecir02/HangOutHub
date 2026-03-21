-- AlterTable
ALTER TABLE "Session"
ADD COLUMN "refreshTokenHash" VARCHAR(255),
ADD COLUMN "expiresAt" TIMESTAMP(6),
ADD COLUMN "lastUsedAt" TIMESTAMP(6),
ADD COLUMN "revokedAt" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "OutingParticipant"
ADD COLUMN "chatLastReadAt" TIMESTAMP(6);

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "ChatMessage_outingId_sentAt_idx" ON "ChatMessage"("outingId", "sentAt");
