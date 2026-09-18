# Data model

Everything users create is a separate, votable row. Authors may edit and delete
their own rows, but nothing is lost: every create and edit writes a row to
`revisions`, and deletes only set `status = deleted`. A row that other people
have built on (examples, links, votes) can no longer be deleted by its author.

## Tables

### dialects
Reference data, seeded, editable by admins only.

| column     | type      | notes                                  |
|------------|-----------|----------------------------------------|
| id         | int pk    |                                        |
| slug       | text uniq | latin, for URLs only (e.g. `egyptian`) |
| name_ar    | text      | displayed name, Arabic                 |
| parent_id  | int null  | null for top-level groups              |
| sort_order | int       |                                        |

### words
The MSA hub. One row per concept.

| column              | type       | notes                                     |
|---------------------|------------|-------------------------------------------|
| id                  | int pk     |                                           |
| headword            | text       | MSA form as written, with optional tashkeel |
| headword_normalized | text idx   | see normalisation rules in PROJECT.md     |
| definition          | text       | MSA definition                            |
| created_by          | int fk users |                                         |
| created_at          | timestamptz |                                          |
| score               | int        | denormalised vote total, recomputed       |
| status              | enum       | active, hidden, deleted                   |

Two rows may share a headword (homonyms). Duplicate concepts are resolved by
votes and later by a merge tool.

### entries
A dialect's word for a concept.

| column           | type         | notes                                   |
|------------------|--------------|-----------------------------------------|
| id               | int pk       |                                         |
| dialect_id       | int fk       | may point at a group or a sub-dialect   |
| form             | text         | the dialect word, Arabic script         |
| form_normalized  | text idx     |                                         |
| meaning          | text         | explanation in Arabic                   |
| notes            | text null    | register, connotation, origin           |
| created_by       | int fk users |                                         |
| created_at       | timestamptz  |                                         |
| score            | int          |                                         |
| status           | enum         |                                         |

An entry is created standalone. Its connection to one or more words lives in
`word_entry_links`, so that linking is a user action and votable, and so one
dialect form can map to several MSA concepts (polysemy).

### word_entry_links
The cross-dialect graph.

| column      | type         | notes                                 |
|-------------|--------------|---------------------------------------|
| id          | int pk       |                                       |
| word_id     | int fk       |                                       |
| entry_id    | int fk       |                                       |
| created_by  | int fk users | the user who proposed the link        |
| created_at  | timestamptz  |                                       |
| score       | int          |                                       |
| status      | enum         |                                       |
| unique (word_id, entry_id) |

A word page shows the entries whose link score is above a threshold, grouped
by dialect. Links below the threshold are shown collapsed as "suggested".

### examples

| column      | type         | notes                                    |
|-------------|--------------|------------------------------------------|
| id          | int pk       |                                          |
| entry_id    | int fk       |                                          |
| text        | text         | sentence in the dialect                  |
| gloss       | text null    | optional rendering in MSA                |
| created_by  | int fk users |                                          |
| created_at  | timestamptz  |                                          |
| score       | int          |                                          |
| status      | enum         |                                          |

### revisions

The history of every user-generated row. `data` holds the content fields after
the change (for a delete, `{"status": "deleted"}`). Revision 1 is the creation.

| column      | type        | notes                                     |
|-------------|-------------|-------------------------------------------|
| id          | int pk      |                                           |
| target_type | enum        | word, entry, link, example                |
| target_id   | int         |                                           |
| revision_no | int         | unique with target_type + target_id       |
| data        | jsonb       | content after the change                  |
| author_id   | int fk null |                                           |
| reason      | text null   | optional, entered by the editor           |
| created_at  | timestamptz |                                           |

`words`, `entries`, `word_entry_links` and `examples` also carry `updated_at`,
and `words` has `kind` (word, phrase, proverb; default word).

### votes
One table for all targets.

| column       | type        | notes                                        |
|--------------|-------------|----------------------------------------------|
| id           | bigint pk   |                                              |
| target_type  | enum        | word, entry, link, example                   |
| target_id    | int         |                                              |
| value        | smallint    | +1 or -1                                     |
| voter_key    | text        | `u:<user_id>` or `a:<anon_token>`            |
| ip_hash      | text        | for rate limiting, salted hash               |
| created_at   | timestamptz |                                              |
| unique (target_type, target_id, voter_key) |

Anonymous voters get a signed, httpOnly cookie token on first vote. When an
anonymous voter later signs up, their `a:` votes are re-keyed to `u:`. A
`weight` column will be added when reputation lands; until then every vote
weighs 1.

### flags

| column       | type        | notes                                 |
|--------------|-------------|---------------------------------------|
| id           | int pk      |                                       |
| target_type  | enum        |                                       |
| target_id    | int         |                                       |
| reason       | enum        | offensive, wrong_dialect, wrong_link, spam, other |
| comment      | text null   |                                       |
| reporter_key | text        | same scheme as votes                  |
| created_at   | timestamptz |                                       |
| resolved_at  | timestamptz null |                                  |

### users

| column        | type        | notes                                      |
|---------------|-------------|--------------------------------------------|
| id            | int pk      |                                            |
| email         | text uniq   |                                            |
| display_name  | text        | Arabic script enforced                     |
| role          | enum        | user, moderator, admin                     |
| reputation    | int         | 0 for now; reserved for the future system  |
| password_hash | text null   | null for provider-only accounts (Google)   |
| email_verified_at | timestamptz null | set by the verification link or by Google |
| avatar_url    | text null   |                                            |
| bio           | text null   | Arabic script enforced                     |
| last_seen_at  | timestamptz null | updated on login                      |
| deleted_at    | timestamptz null | see below                             |
| created_at    | timestamptz |                                            |

Deleting an account keeps the row and anonymises it (email becomes
`deleted-<id>@lahga.invalid`, display_name «مستخدم محذوف», everything personal
nulled, `deleted_at` set). Content stays attributed to the row, so other
people's examples and votes on it survive.

### oauth_accounts

One row per linked provider login. Sign-in with a provider whose email matches
an existing account links to it instead of creating a second account.

| column           | type        | notes                              |
|------------------|-------------|------------------------------------|
| id               | int pk      |                                    |
| user_id          | int fk      |                                    |
| provider         | text        | google, later gitlab, facebook, …  |
| provider_user_id | text        | unique with provider               |
| created_at       | timestamptz |                                    |

### email_tokens

Single-use links for email verification and password reset. The link carries
a random 32-byte token; the table stores only its SHA-256, so a database leak
does not hand out working links.

| column     | type        | notes                                         |
|------------|-------------|-----------------------------------------------|
| id         | int pk      |                                               |
| user_id    | int fk      |                                               |
| purpose    | enum        | verify, reset                                 |
| token_hash | text uniq   |                                               |
| expires_at | timestamptz | one hour after issue                          |
| used_at    | timestamptz null | set on use; issuing a new token also voids older ones of the same purpose |
| created_at | timestamptz |                                               |

## Ranking

Lists are ordered by a time-decayed score (Reddit "hot" style) for the
front page and by a Wilson lower bound for entries inside a word page, so a
new, well-received entry can overtake an old one with many mixed votes.

## Input validation

All content fields (headword, definition, form, meaning, notes, example text,
gloss, display_name) must match:

- allowed: Arabic block U+0600–U+06FF, Arabic Supplement U+0750–U+077F,
  Arabic Extended-A U+08A0–U+08FF, Arabic Presentation Forms are normalised
  away, ASCII and Arabic digits, whitespace, and common punctuation
- rejected: any Latin letter (a–z, A–Z)

This is the mechanical form of the "Arabic script only" rule.
