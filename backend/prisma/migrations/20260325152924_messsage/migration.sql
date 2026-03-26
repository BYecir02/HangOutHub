-- CreateTable
CREATE TABLE "DirectConversation" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userOneId" UUID NOT NULL,
    "userTwoId" UUID NOT NULL,
    "lastMessageAt" TIMESTAMP(6),
    "userOneLastReadAt" TIMESTAMP(6),
    "userTwoLastReadAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6),

    CONSTRAINT "DirectConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "conversationId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectConversation_userOneId_idx" ON "DirectConversation"("userOneId");

-- CreateIndex
CREATE INDEX "DirectConversation_userTwoId_idx" ON "DirectConversation"("userTwoId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectConversation_userOneId_userTwoId_key" ON "DirectConversation"("userOneId", "userTwoId");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_sentAt_idx" ON "DirectMessage"("conversationId", "sentAt");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_idx" ON "DirectMessage"("senderId");

-- AddForeignKey
ALTER TABLE "DirectConversation" ADD CONSTRAINT "DirectConversation_userOneId_fkey" FOREIGN KEY ("userOneId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DirectConversation" ADD CONSTRAINT "DirectConversation_userTwoId_fkey" FOREIGN KEY ("userTwoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DirectConversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
