ALTER TABLE "Booking"
ADD COLUMN "clientRequestId" VARCHAR(64);

CREATE UNIQUE INDEX "Booking_userId_eventId_clientRequestId_key"
ON "Booking"("userId", "eventId", "clientRequestId");
