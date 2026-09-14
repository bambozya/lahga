import {
  pgTable, pgEnum, serial, bigserial, integer, smallint, text, timestamp, uniqueIndex, index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ---------- enums ----------

export const contentStatus = pgEnum('content_status', ['active', 'hidden', 'deleted'])
export const voteTarget = pgEnum('vote_target', ['word', 'entry', 'link', 'example'])
export const flagReason = pgEnum('flag_reason', ['offensive', 'wrong_dialect', 'wrong_link', 'spam', 'other'])
export const userRole = pgEnum('user_role', ['user', 'moderator', 'admin'])

// ---------- users ----------

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  role: userRole('role').notNull().default('user'),
  reputation: integer('reputation').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- dialects (reference data, two-level tree) ----------

export const dialects = pgTable('dialects', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  descriptionAr: text('description_ar'),
  parentId: integer('parent_id').references((): any => dialects.id),
  sortOrder: integer('sort_order').notNull().default(0),
  active: smallint('active').notNull().default(1),
})

// ---------- words: the MSA hub ----------

export const words = pgTable('words', {
  id: serial('id').primaryKey(),
  headword: text('headword').notNull(),
  headwordNormalized: text('headword_normalized').notNull(),
  definition: text('definition').notNull(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  score: integer('score').notNull().default(0),
  status: contentStatus('status').notNull().default('active'),
}, t => [
  index('words_headword_normalized_idx').on(t.headwordNormalized),
])

// ---------- entries: a dialect's word ----------

export const entries = pgTable('entries', {
  id: serial('id').primaryKey(),
  dialectId: integer('dialect_id').notNull().references(() => dialects.id),
  form: text('form').notNull(),
  formNormalized: text('form_normalized').notNull(),
  meaning: text('meaning').notNull(),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  score: integer('score').notNull().default(0),
  status: contentStatus('status').notNull().default('active'),
}, t => [
  index('entries_form_normalized_idx').on(t.formNormalized),
  index('entries_dialect_idx').on(t.dialectId),
])

// ---------- links: the cross-dialect graph ----------

export const wordEntryLinks = pgTable('word_entry_links', {
  id: serial('id').primaryKey(),
  wordId: integer('word_id').notNull().references(() => words.id),
  entryId: integer('entry_id').notNull().references(() => entries.id),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  score: integer('score').notNull().default(0),
  status: contentStatus('status').notNull().default('active'),
}, t => [
  uniqueIndex('word_entry_links_unique').on(t.wordId, t.entryId),
  index('word_entry_links_entry_idx').on(t.entryId),
])

// ---------- examples ----------

export const examples = pgTable('examples', {
  id: serial('id').primaryKey(),
  entryId: integer('entry_id').notNull().references(() => entries.id),
  text: text('text').notNull(),
  gloss: text('gloss'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  score: integer('score').notNull().default(0),
  status: contentStatus('status').notNull().default('active'),
}, t => [
  index('examples_entry_idx').on(t.entryId),
])

// ---------- votes ----------

export const votes = pgTable('votes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  targetType: voteTarget('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  value: smallint('value').notNull(), // +1 or -1
  voterKey: text('voter_key').notNull(), // "u:<user_id>" or "a:<anon_token>"
  ipHash: text('ip_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('votes_unique_per_voter').on(t.targetType, t.targetId, t.voterKey),
  index('votes_target_idx').on(t.targetType, t.targetId),
])

// ---------- flags ----------

export const flags = pgTable('flags', {
  id: serial('id').primaryKey(),
  targetType: voteTarget('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  reason: flagReason('reason').notNull(),
  comment: text('comment'),
  reporterKey: text('reporter_key').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
})

// ---------- relations (for db.query.* helpers) ----------

export const dialectsRelations = relations(dialects, ({ one, many }) => ({
  parent: one(dialects, { fields: [dialects.parentId], references: [dialects.id], relationName: 'tree' }),
  children: many(dialects, { relationName: 'tree' }),
  entries: many(entries),
}))

export const wordsRelations = relations(words, ({ many }) => ({
  links: many(wordEntryLinks),
}))

export const entriesRelations = relations(entries, ({ one, many }) => ({
  dialect: one(dialects, { fields: [entries.dialectId], references: [dialects.id] }),
  links: many(wordEntryLinks),
  examples: many(examples),
}))

export const wordEntryLinksRelations = relations(wordEntryLinks, ({ one }) => ({
  word: one(words, { fields: [wordEntryLinks.wordId], references: [words.id] }),
  entry: one(entries, { fields: [wordEntryLinks.entryId], references: [entries.id] }),
}))

export const examplesRelations = relations(examples, ({ one }) => ({
  entry: one(entries, { fields: [examples.entryId], references: [entries.id] }),
}))
