CREATE TYPE "public"."word_kind" AS ENUM('word', 'phrase', 'proverb');--> statement-breakpoint
CREATE TABLE "revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_type" "vote_target" NOT NULL,
	"target_id" integer NOT NULL,
	"revision_no" integer NOT NULL,
	"data" jsonb NOT NULL,
	"author_id" integer,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "examples" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "word_entry_links" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "kind" "word_kind" DEFAULT 'word' NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "revisions_target_no_unique" ON "revisions" USING btree ("target_type","target_id","revision_no");--> statement-breakpoint
CREATE INDEX "entries_created_by_idx" ON "entries" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "words_created_by_idx" ON "words" USING btree ("created_by");