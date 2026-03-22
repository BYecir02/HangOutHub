ALTER TABLE "Notification"
ADD COLUMN "title" VARCHAR(120),
ADD COLUMN "message" TEXT,
ADD COLUMN "severity" VARCHAR(16) DEFAULT 'INFO',
ADD COLUMN "payload" JSONB,
ADD COLUMN "targetPath" VARCHAR(255);

CREATE INDEX "Notification_userId_isRead_createdAt_idx"
ON "Notification"("userId", "isRead", "createdAt");

CREATE INDEX "Notification_userId_type_createdAt_idx"
ON "Notification"("userId", "type", "createdAt");
