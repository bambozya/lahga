CREATE TYPE "public"."flag_resolution" AS ENUM('dismissed', 'hidden', 'deleted');--> statement-breakpoint
DROP INDEX "votes_unique_per_voter";--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "upvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "downvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "examples" ADD COLUMN "upvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "examples" ADD COLUMN "downvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "flags" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "flags" ADD COLUMN "resolved_by" integer;--> statement-breakpoint
ALTER TABLE "flags" ADD COLUMN "resolution" "flag_resolution";--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "word_entry_links" ADD COLUMN "upvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "word_entry_links" ADD COLUMN "downvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "upvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "downvotes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flags_target_idx" ON "flags" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "flags_open_idx" ON "flags" USING btree ("resolved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_unique_per_user" ON "votes" USING btree ("target_type","target_id","user_id");--> statement-breakpoint
ALTER TABLE "flags" DROP COLUMN "reporter_key";--> statement-breakpoint
ALTER TABLE "votes" DROP COLUMN "voter_key";--> statement-breakpoint
ALTER TABLE "votes" DROP COLUMN "ip_hash";