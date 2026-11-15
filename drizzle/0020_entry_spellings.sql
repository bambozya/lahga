CREATE TABLE "entry_spellings" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"form" text NOT NULL,
	"form_normalized" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entry_spellings" ADD CONSTRAINT "entry_spellings_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entry_spellings_unique" ON "entry_spellings" USING btree ("entry_id","form_normalized");--> statement-breakpoint
CREATE INDEX "entry_spellings_form_normalized_idx" ON "entry_spellings" USING btree ("form_normalized");--> statement-breakpoint
-- The same trigram index entries.form_normalized has (migration 0005), so a
-- substring search finds a listed spelling as fast as it finds a form.
CREATE INDEX IF NOT EXISTS "entry_spellings_form_trgm_idx" ON "entry_spellings" USING gin ("form_normalized" gin_trgm_ops);
