-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "ownerId" UUID;

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "notificationMessages" BOOLEAN NOT NULL DEFAULT true,
    "notificationOutingInvites" BOOLEAN NOT NULL DEFAULT true,
    "notificationFriendRequests" BOOLEAN NOT NULL DEFAULT true,
    "notificationSavedPlacesActivity" BOOLEAN NOT NULL DEFAULT true,
    "profilePublic" BOOLEAN NOT NULL DEFAULT true,
    "defaultPostVisibility" VARCHAR(20) NOT NULL DEFAULT 'public',
    "allowOutingInvitesFrom" VARCHAR(20) NOT NULL DEFAULT 'connections',
    "theme" VARCHAR(20) NOT NULL DEFAULT 'system',
    "language" VARCHAR(10) NOT NULL DEFAULT 'fr',
    "dataSaver" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
