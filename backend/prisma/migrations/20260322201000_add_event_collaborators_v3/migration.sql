CREATE TABLE "EventCollaborator" (
  "eventId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "permission" VARCHAR(16) DEFAULT 'EDIT',
  "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventCollaborator_pkey" PRIMARY KEY ("eventId", "userId")
);

CREATE INDEX "EventCollaborator_userId_idx" ON "EventCollaborator"("userId");

ALTER TABLE "EventCollaborator"
ADD CONSTRAINT "EventCollaborator_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "EventCollaborator"
ADD CONSTRAINT "EventCollaborator_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
