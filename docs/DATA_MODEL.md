# Data model

Everything users create is a separate, votable row. Nothing user-generated is
edited in place; corrections are new rows that compete on votes. This keeps the
door open for the future reputation system.

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
| created_at    | timestamptz |                                            |

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
