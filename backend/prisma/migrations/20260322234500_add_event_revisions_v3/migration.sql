CREATE TABLE "EventRevision" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "eventId" UUID NOT NULL,
  "actorUserId" UUID,
  "action" VARCHAR(32) NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventRevision_eventId_createdAt_idx" ON "EventRevision"("eventId", "createdAt");
CREATE INDEX "EventRevision_actorUserId_idx" ON "EventRevision"("actorUserId");

ALTER TABLE "EventRevision"
ADD CONSTRAINT "EventRevision_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "EventRevision"
ADD CONSTRAINT "EventRevision_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
