-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'SCANNED', 'PAID', 'USED', 'CHECKED_IN');

-- Fix null status values before type conversion
UPDATE "Booking" SET "status" = 'PENDING' WHERE "status" IS NULL;

-- Remove bookings with no eventId (invalid data — a booking must reference an event)
DELETE FROM "Booking" WHERE "eventId" IS NULL;

-- Drop existing varchar default before changing column type
ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;

-- Convert status column from varchar(20) to BookingStatus enum
ALTER TABLE "Booking"
  ALTER COLUMN "status" TYPE "BookingStatus" USING "status"::"BookingStatus";

-- Set new typed default and NOT NULL
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"BookingStatus";
ALTER TABLE "Booking" ALTER COLUMN "status" SET NOT NULL;

-- Make eventId non-nullable
ALTER TABLE "Booking" ALTER COLUMN "eventId" SET NOT NULL;
