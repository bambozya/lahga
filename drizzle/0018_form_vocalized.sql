ALTER TABLE "entries" ADD COLUMN "form_vocalized" text;--> statement-breakpoint
-- Forms written with harakat before the field existed (about 3,000 of 25,000,
-- mostly a shadda: هلّق, كويّس) split into the bare form and its vowelled
-- spelling. form_normalized already had the marks stripped, so search, the
-- form pages and the duplicate check see no change. The set of marks is
-- DIACRITICS in shared/utils/arabic.ts: tashkeel, superscript alef, tatweel.
UPDATE "entries" SET "form_vocalized" = "form", "form" = regexp_replace("form", '[ً-ْٰـ]', '', 'g') WHERE "form" ~ '[ً-ْٰـ]';
