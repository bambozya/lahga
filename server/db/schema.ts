import {
  pgTable, pgEnum, serial, bigserial, integer, smallint, text, timestamp, jsonb, uniqueIndex, index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ---------- enums ----------

export const contentStatus = pgEnum('content_status', ['active', 'hidden', 'deleted'])
export const voteTarget = pgEnum('vote_target', ['word', 'entry', 'link', 'example'])
export const flagReason = pgEnum('flag_reason', ['offensive', 'wrong_dialect', 'wrong_link', 'spam', 'other'])
export const userRole = pgEnum('user_role', ['user', 'moderator', 'admin'])
export const emailTokenPurpose = pgEnum('email_token_purpose', ['verify', 'reset'])
export const wordKind = pgEnum('word_kind', ['word', 'phrase', 'proverb'])
export const flagResolution = pgEnum('flag_resolution', ['dismissed', 'hidden', 'deleted'])

// ---------- users ----------

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  role: userRole('role').notNull().default('user'),
  reputation: integer('reputation').notNull().default(0),
  // null for accounts that only ever logged in through a provider (Google, …)
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  // Set when the account is deleted. The row stays, anonymised, so content keeps its author id.
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- oauth accounts: one row per linked provider login ----------

export const oauthAccounts = pgTable('oauth_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  provider: text('provider').notNull(), // 'google', later 'gitlab', 'facebook', …
  providerUserId: text('provider_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('oauth_accounts_provider_unique').on(t.provider, t.providerUserId),
  index('oauth_accounts_user_idx').on(t.userId),
])

// ---------- email tokens: single-use links for verification and password reset ----------

export const emailTokens = pgTable('email_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  purpose: emailTokenPurpose('purpose').notNull(),
  tokenHash: text('token_hash').notNull().unique(), // sha256 of the token in the link
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index('email_tokens_user_idx').on(t.userId),
])

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
  kind: wordKind('kind').notNull().default('word'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  score: integer('score').notNull().default(0), // upvotes - downvotes, kept in step by /api/votes
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  status: contentStatus('status').notNull().default('active'),
}, t => [
  index('words_headword_normalized_idx').on(t.headwordNormalized),
  index('words_created_by_idx').on(t.createdBy),
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
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  score: integer('score').notNull().default(0), // upvotes - downvotes, kept in step by /api/votes
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  status: contentStatus('status').notNull().default('active'),
}, t => [
  index('entries_form_normalized_idx').on(t.formNormalized),
  index('entries_dialect_idx').on(t.dialectId),
  index('entries_created_by_idx').on(t.createdBy),
])

// ---------- links: the cross-dialect graph ----------

export const wordEntryLinks = pgTable('word_entry_links', {
  id: serial('id').primaryKey(),
  wordId: integer('word_id').notNull().references(() => words.id),
  entryId: integer('entry_id').notNull().references(() => entries.id),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  score: integer('score').notNull().default(0), // upvotes - downvotes, kept in step by /api/votes
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
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
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  score: integer('score').notNull().default(0), // upvotes - downvotes, kept in step by /api/votes
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  status: contentStatus('status').notNull().default('active'),
}, t => [
  index('examples_entry_idx').on(t.entryId),
])

// ---------- revisions: the history of every user-generated row ----------
// Every create and edit writes one row with the content fields after the change.
// The live tables hold the current version; this table lets anyone see what changed
// and lets an admin put an older version back.

export const revisions = pgTable('revisions', {
  id: serial('id').primaryKey(),
  targetType: voteTarget('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  revisionNo: integer('revision_no').notNull(),
  data: jsonb('data').notNull().$type<Record<string, unknown>>(),
  authorId: integer('author_id').references(() => users.id),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('revisions_target_no_unique').on(t.targetType, t.targetId, t.revisionNo),
])

// ---------- votes ----------

// One vote per account per item. Only logged-in users vote (decided 2026-09-18).
export const votes = pgTable('votes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  targetType: voteTarget('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  value: smallint('value').notNull(), // +1 or -1
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex('votes_unique_per_user').on(t.targetType, t.targetId, t.userId),
  index('votes_target_idx').on(t.targetType, t.targetId),
])

// ---------- flags ----------

export const flags = pgTable('flags', {
  id: serial('id').primaryKey(),
  targetType: voteTarget('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  reason: flagReason('reason').notNull(),
  comment: text('comment'),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: integer('resolved_by').references(() => users.id),
  resolution: flagResolution('resolution'),
}, t => [
  index('flags_target_idx').on(t.targetType, t.targetId),
  index('flags_open_idx').on(t.resolvedAt),
])

export const flagsRelations = relations(flags, ({ one }) => ({
  reporter: one(users, { fields: [flags.userId], references: [users.id] }),
}))

// ---------- relations (for db.query.* helpers) ----------

export const dialectsRelations = relations(dialects, ({ one, many }) => ({
  parent: one(dialects, { fields: [dialects.parentId], references: [dialects.id], relationName: 'tree' }),
  children: many(dialects, { relationName: 'tree' }),
  entries: many(entries),
}))

export const usersRelations = relations(users, ({ many }) => ({
  oauthAccounts: many(oauthAccounts),
}))

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, { fields: [oauthAccounts.userId], references: [users.id] }),
}))

export const wordsRelations = relations(words, ({ one, many }) => ({
  links: many(wordEntryLinks),
  author: one(users, { fields: [words.createdBy], references: [users.id] }),
}))

export const entriesRelations = relations(entries, ({ one, many }) => ({
  dialect: one(dialects, { fields: [entries.dialectId], references: [dialects.id] }),
  links: many(wordEntryLinks),
  examples: many(examples),
  author: one(users, { fields: [entries.createdBy], references: [users.id] }),
}))

export const wordEntryLinksRelations = relations(wordEntryLinks, ({ one }) => ({
  word: one(words, { fields: [wordEntryLinks.wordId], references: [words.id] }),
  entry: one(entries, { fields: [wordEntryLinks.entryId], references: [entries.id] }),
}))

export const examplesRelations = relations(examples, ({ one }) => ({
  entry: one(entries, { fields: [examples.entryId], references: [entries.id] }),
  author: one(users, { fields: [examples.createdBy], references: [users.id] }),
}))

export const revisionsRelations = relations(revisions, ({ one }) => ({
  author: one(users, { fields: [revisions.authorId], references: [users.id] }),
}))
