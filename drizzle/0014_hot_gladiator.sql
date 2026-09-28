ALTER TABLE "search_miss_events" ADD COLUMN "kind" text DEFAULT 'miss' NOT NULL;--> statement-breakpoint
ALTER TABLE "search_misses" ADD COLUMN "reports" integer DEFAULT 0 NOT NULL;