CREATE TABLE "guest_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"voter" text NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest_votes" ADD CONSTRAINT "guest_votes_link_id_word_entry_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."word_entry_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guest_votes_unique" ON "guest_votes" USING btree ("link_id","voter");