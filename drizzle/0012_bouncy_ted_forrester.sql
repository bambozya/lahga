CREATE TABLE "dialect_quiz_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"slot" smallint NOT NULL,
	"entry_id" integer NOT NULL,
	"word_id" integer NOT NULL,
	"correct_group_id" integer NOT NULL,
	"choice_group_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dialect_quiz_rounds" ADD CONSTRAINT "dialect_quiz_rounds_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialect_quiz_rounds" ADD CONSTRAINT "dialect_quiz_rounds_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialect_quiz_rounds" ADD CONSTRAINT "dialect_quiz_rounds_correct_group_id_dialects_id_fk" FOREIGN KEY ("correct_group_id") REFERENCES "public"."dialects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dialect_quiz_rounds_date_slot_unique" ON "dialect_quiz_rounds" USING btree ("date","slot");