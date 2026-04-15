CREATE TABLE "UserFlowEvent" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "distinctId" VARCHAR(80) NOT NULL,
    "sessionId" VARCHAR(80) NOT NULL,
    "userId" UUID NULL,
    "eventName" VARCHAR(64) NOT NULL,
    "actionName" VARCHAR(120) NULL,
    "screenKey" VARCHAR(180) NULL,
    "screenName" VARCHAR(120) NULL,
    "path" VARCHAR(255) NULL,
    "previousScreenKey" VARCHAR(180) NULL,
    "previousPath" VARCHAR(255) NULL,
    "entityType" VARCHAR(64) NULL,
    "entityId" VARCHAR(64) NULL,
    "platform" VARCHAR(20) NULL,
    "appVersion" VARCHAR(20) NULL,
    "buildChannel" VARCHAR(30) NULL,
    "locale" VARCHAR(16) NULL,
    "metadata" JSONB NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFlowEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserFlowEvent"
  ADD CONSTRAINT "UserFlowEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "UserFlowEvent_createdAt_idx" ON "UserFlowEvent"("createdAt");
CREATE INDEX "UserFlowEvent_screenKey_createdAt_idx" ON "UserFlowEvent"("screenKey", "createdAt");
CREATE INDEX "UserFlowEvent_eventName_createdAt_idx" ON "UserFlowEvent"("eventName", "createdAt");
CREATE INDEX "UserFlowEvent_sessionId_createdAt_idx" ON "UserFlowEvent"("sessionId", "createdAt");
CREATE INDEX "UserFlowEvent_userId_createdAt_idx" ON "UserFlowEvent"("userId", "createdAt");
