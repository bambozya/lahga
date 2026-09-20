ALTER TABLE "words" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_slug_unique" UNIQUE("slug");