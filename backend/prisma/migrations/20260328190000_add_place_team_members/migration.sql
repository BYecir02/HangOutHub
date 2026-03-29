CREATE TABLE "PlaceTeamMember" (
  "placeId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" VARCHAR(20) DEFAULT 'STAFF',
  "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaceTeamMember_pkey" PRIMARY KEY ("placeId", "userId")
);

CREATE INDEX "PlaceTeamMember_userId_idx" ON "PlaceTeamMember"("userId");

ALTER TABLE "PlaceTeamMember"
ADD CONSTRAINT "PlaceTeamMember_placeId_fkey"
FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "PlaceTeamMember"
ADD CONSTRAINT "PlaceTeamMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
