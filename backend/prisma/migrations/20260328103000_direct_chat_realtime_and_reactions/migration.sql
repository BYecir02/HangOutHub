-- AlterTable
ALTER TABLE "DirectMessage"
ADD COLUMN "clientId" VARCHAR(64),
ADD COLUMN "deliveredAt" TIMESTAMP(6),
ADD COLUMN "readAt" TIMESTAMP(6);

-- CreateTable
CREATE TABLE "DirectMessageReaction" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "messageId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "emoji" VARCHAR(16) NOT NULL,
  "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DirectMessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessage_conversationId_senderId_clientId_key"
ON "DirectMessage"("conversationId", "senderId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessageReaction_messageId_userId_key"
ON "DirectMessageReaction"("messageId", "userId");

-- CreateIndex
CREATE INDEX "DirectMessageReaction_userId_idx"
ON "DirectMessageReaction"("userId");

-- AddForeignKey
ALTER TABLE "DirectMessageReaction"
ADD CONSTRAINT "DirectMessageReaction_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "DirectMessage"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DirectMessageReaction"
ADD CONSTRAINT "DirectMessageReaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
