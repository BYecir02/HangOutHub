ALTER TABLE "Promotion"
ADD COLUMN "code" VARCHAR(32),
ADD COLUMN "discountType" VARCHAR(16) DEFAULT 'PERCENT',
ADD COLUMN "discountValue" DECIMAL(10,2),
ADD COLUMN "maxRedemptions" INTEGER,
ADD COLUMN "redeemedCount" INTEGER DEFAULT 0;

CREATE UNIQUE INDEX "Promotion_eventId_code_key" ON "Promotion"("eventId", "code");
