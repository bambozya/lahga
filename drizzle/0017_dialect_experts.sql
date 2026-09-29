CREATE TABLE "dialect_experts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"dialect_id" integer NOT NULL,
	"granted_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dialect_experts" ADD CONSTRAINT "dialect_experts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialect_experts" ADD CONSTRAINT "dialect_experts_dialect_id_dialects_id_fk" FOREIGN KEY ("dialect_id") REFERENCES "public"."dialects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dialect_experts" ADD CONSTRAINT "dialect_experts_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dialect_experts_unique" ON "dialect_experts" USING btree ("user_id","dialect_id");