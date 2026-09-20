CREATE TABLE "daily_puzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"word_id" integer NOT NULL,
	"reveal_order" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_puzzles_date_unique" UNIQUE("date")
);
--> statement-breakpoint
ALTER TABLE "daily_puzzles" ADD CONSTRAINT "daily_puzzles_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_puzzles_word_idx" ON "daily_puzzles" USING btree ("word_id");