ALTER TABLE "PlaceClaim"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(6);

CREATE UNIQUE INDEX IF NOT EXISTS "PlaceClaim_placeId_userId_key"
  ON "PlaceClaim"("placeId", "userId");

CREATE INDEX IF NOT EXISTS "PlaceClaim_placeId_status_idx"
  ON "PlaceClaim"("placeId", "status");

CREATE INDEX IF NOT EXISTS "PlaceClaim_userId_idx"
  ON "PlaceClaim"("userId");
