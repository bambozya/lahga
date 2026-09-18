-- Fast substring search on Arabic text. A GIN trigram index lets ILIKE '%term%'
-- use an index instead of scanning every row, and enables similarity ranking.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "words_headword_trgm_idx" ON "words" USING gin ("headword_normalized" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entries_form_trgm_idx" ON "entries" USING gin ("form_normalized" gin_trgm_ops);
