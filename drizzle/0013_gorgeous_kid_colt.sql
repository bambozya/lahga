CREATE TABLE "search_miss_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"miss_id" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"country" text,
	"asn" integer,
	"network" text,
	"visitor" text,
	"device" text,
	"os" text,
	"browser" text,
	"lang" text,
	"timezone" text,
	"referrer" text,
	"via" text NOT NULL,
	"signed_in" boolean DEFAULT false NOT NULL,
	"bot" text
);
--> statement-breakpoint
ALTER TABLE "search_miss_events" ADD CONSTRAINT "search_miss_events_miss_id_search_misses_id_fk" FOREIGN KEY ("miss_id") REFERENCES "public"."search_misses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_miss_events_miss_idx" ON "search_miss_events" USING btree ("miss_id","at");--> statement-breakpoint
CREATE INDEX "search_miss_events_at_idx" ON "search_miss_events" USING btree ("at");