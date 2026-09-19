CREATE TABLE "search_misses" (
	"id" serial PRIMARY KEY NOT NULL,
	"term" text NOT NULL,
	"term_normalized" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"last_searched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_misses_term_normalized_unique" UNIQUE("term_normalized")
);
