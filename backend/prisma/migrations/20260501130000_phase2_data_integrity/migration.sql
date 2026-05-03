-- ============================================================
-- Phase 2 — Data integrity fixes
-- ============================================================

-- CreateEnum: PlaceTeamRole
CREATE TYPE "PlaceTeamRole" AS ENUM ('MANAGER', 'STAFF', 'SCANNER');

-- CreateEnum: EventCollaboratorPermission
CREATE TYPE "EventCollaboratorPermission" AS ENUM ('EDIT', 'SCAN');

-- ============================================================
-- 1. OutingParticipant: cascade delete when outing is deleted
-- ============================================================
DO $$
DECLARE v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = '"OutingParticipant"'::regclass
    AND confrelid = '"Outing"'::regclass
    AND contype = 'f';
  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "OutingParticipant" DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;
ALTER TABLE "OutingParticipant"
  ADD CONSTRAINT "OutingParticipant_outingId_fkey"
  FOREIGN KEY ("outingId") REFERENCES "Outing"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ============================================================
-- 2. ChatMessage: cascade delete when outing is deleted
-- ============================================================
DO $$
DECLARE v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = '"ChatMessage"'::regclass
    AND confrelid = '"Outing"'::regclass
    AND contype = 'f';
  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "ChatMessage" DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;
ALTER TABLE "ChatMessage"
  ADD CONSTRAINT "ChatMessage_outingId_fkey"
  FOREIGN KEY ("outingId") REFERENCES "Outing"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ============================================================
-- 3. OutingMedia: cascade delete when outing is deleted
-- ============================================================
DO $$
DECLARE v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = '"OutingMedia"'::regclass
    AND confrelid = '"Outing"'::regclass
    AND contype = 'f';
  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "OutingMedia" DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;
ALTER TABLE "OutingMedia"
  ADD CONSTRAINT "OutingMedia_outingId_fkey"
  FOREIGN KEY ("outingId") REFERENCES "Outing"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ============================================================
-- 4. Report.resolvedByUserId: add FK with SetNull on user delete
-- ============================================================
ALTER TABLE "Report"
  ADD CONSTRAINT "Report_resolvedByUserId_fkey"
  FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- ============================================================
-- 5. PlaceTeamMember.role: convert varchar to enum
-- ============================================================
UPDATE "PlaceTeamMember" SET "role" = 'STAFF' WHERE "role" IS NULL OR "role" NOT IN ('MANAGER', 'STAFF', 'SCANNER');
ALTER TABLE "PlaceTeamMember" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "PlaceTeamMember"
  ALTER COLUMN "role" TYPE "PlaceTeamRole" USING "role"::"PlaceTeamRole";
ALTER TABLE "PlaceTeamMember" ALTER COLUMN "role" SET DEFAULT 'STAFF'::"PlaceTeamRole";
ALTER TABLE "PlaceTeamMember" ALTER COLUMN "role" SET NOT NULL;

-- ============================================================
-- 6. EventCollaborator.permission: convert varchar to enum
-- ============================================================
UPDATE "EventCollaborator" SET "permission" = 'EDIT' WHERE "permission" IS NULL OR "permission" NOT IN ('EDIT', 'SCAN');
ALTER TABLE "EventCollaborator" ALTER COLUMN "permission" DROP DEFAULT;
ALTER TABLE "EventCollaborator"
  ALTER COLUMN "permission" TYPE "EventCollaboratorPermission" USING "permission"::"EventCollaboratorPermission";
ALTER TABLE "EventCollaborator" ALTER COLUMN "permission" SET DEFAULT 'EDIT'::"EventCollaboratorPermission";
ALTER TABLE "EventCollaborator" ALTER COLUMN "permission" SET NOT NULL;

-- ============================================================
-- 7. Event.checkInOpensAtOffsetMin / checkInClosesAtOffsetMin: make non-nullable
-- ============================================================
UPDATE "Event" SET "checkInOpensAtOffsetMin" = -60 WHERE "checkInOpensAtOffsetMin" IS NULL;
UPDATE "Event" SET "checkInClosesAtOffsetMin" = 180 WHERE "checkInClosesAtOffsetMin" IS NULL;
ALTER TABLE "Event" ALTER COLUMN "checkInOpensAtOffsetMin" SET NOT NULL;
ALTER TABLE "Event" ALTER COLUMN "checkInClosesAtOffsetMin" SET NOT NULL;
