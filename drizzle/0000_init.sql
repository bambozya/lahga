CREATE TYPE "public"."content_status" AS ENUM('active', 'hidden', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."flag_reason" AS ENUM('offensive', 'wrong_dialect', 'wrong_link', 'spam', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vote_target" AS ENUM('word', 'entry', 'link', 'example');--> statement-breakpoint
CREATE TABLE "dialects" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"description_ar" text,
	"parent_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "dialects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"dialect_id" integer NOT NULL,
	"form" text NOT NULL,
	"form_normalized" text NOT NULL,
	"meaning" text NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "examples" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"text" text NOT NULL,
	"gloss" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_type" "vote_target" NOT NULL,
	"target_id" integer NOT NULL,
	"reason" "flag_reason" NOT NULL,
	"comment" text,
	"reporter_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"reputation" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"target_type" "vote_target" NOT NULL,
	"target_id" integer NOT NULL,
	"value" smallint NOT NULL,
	"voter_key" text NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "word_entry_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"word_id" integer NOT NULL,
	"entry_id" integer NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" serial PRIMARY KEY NOT NULL,
	"headword" text NOT NULL,
	"headword_normalized" text NOT NULL,
	"definition" text NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dialects" ADD CONSTRAINT "dialects_parent_id_dialects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."dialects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_dialect_id_dialects_id_fk" FOREIGN KEY ("dialect_id") REFERENCES "public"."dialects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examples" ADD CONSTRAINT "examples_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examples" ADD CONSTRAINT "examples_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_entry_links" ADD CONSTRAINT "word_entry_links_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_entry_links" ADD CONSTRAINT "word_entry_links_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_entry_links" ADD CONSTRAINT "word_entry_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_form_normalized_idx" ON "entries" USING btree ("form_normalized");--> statement-breakpoint
CREATE INDEX "entries_dialect_idx" ON "entries" USING btree ("dialect_id");--> statement-breakpoint
CREATE INDEX "examples_entry_idx" ON "examples" USING btree ("entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_unique_per_voter" ON "votes" USING btree ("target_type","target_id","voter_key");--> statement-breakpoint
CREATE INDEX "votes_target_idx" ON "votes" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "word_entry_links_unique" ON "word_entry_links" USING btree ("word_id","entry_id");--> statement-breakpoint
CREATE INDEX "word_entry_links_entry_idx" ON "word_entry_links" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "words_headword_normalized_idx" ON "words" USING btree ("headword_normalized");