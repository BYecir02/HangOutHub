-- Add placeId and eventId to Post
ALTER TABLE "Post" ADD COLUMN "placeId" UUID;
ALTER TABLE "Post" ADD COLUMN "eventId" UUID;

-- Foreign keys
ALTER TABLE "Post" ADD CONSTRAINT "Post_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "Post" ADD CONSTRAINT "Post_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
