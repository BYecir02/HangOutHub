-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "cityId" INTEGER;

-- CreateIndex
CREATE INDEX "Event_cityId_idx" ON "Event"("cityId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;