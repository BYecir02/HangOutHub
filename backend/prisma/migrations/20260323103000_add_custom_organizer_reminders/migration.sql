ALTER TABLE "UserSettings"
ADD COLUMN "organizerReminderMode" VARCHAR(16) NOT NULL DEFAULT 'preset',
ADD COLUMN "organizerReminderOffsetsMin" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "UserSettings"
SET "organizerReminderOffsetsMin" = ARRAY_REMOVE(
  ARRAY[
    CASE WHEN "organizerNotifyReminderD1" THEN 1440 ELSE NULL END,
    CASE WHEN "organizerNotifyReminderH3" THEN 180 ELSE NULL END,
    CASE WHEN "organizerNotifyReminderH1" THEN 60 ELSE NULL END
  ],
  NULL
)
WHERE COALESCE(array_length("organizerReminderOffsetsMin", 1), 0) = 0;
