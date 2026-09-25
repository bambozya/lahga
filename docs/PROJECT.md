# لهجة — Lahga

A user-driven dictionary of Arabic dialects, in the spirit of Urban Dictionary,
with one difference that defines the product: every dialect word is linked to a
Modern Standard Arabic (MSA) headword, so the site can show how the same idea is
said across the Arab world.

## Core idea

- A **word** is an MSA headword with a definition in MSA. It is the hub.
- An **entry** is how one dialect expresses that word: the dialectal form, its
  meaning, and notes on usage.
- An **example** is a sentence in that dialect showing the entry in use.
- Every entry, example, and link is created and voted on by users. Votes decide
  what surfaces.

A word page therefore reads: MSA headword and definition at the top, then the
entries grouped by dialect, each with its examples, ranked by votes.

## Rules that shape everything

1. **Arabic script only.** The interface, the content, and the search are all
   in Arabic script. Latin transliteration and Arabizi (3, 7, 2, …) are
   rejected at input. Dialect-specific letters are allowed (گ ڤ چ پ ڨ).
2. **Open to read, account to act.** Anyone can browse and search. An account
   is required to vote and to add words, entries, examples, and links.
   (Decided 2026-09-18; anonymous voting was the earlier idea.)
3. **Users link, votes decide.** Any user can propose that an entry belongs to a
   word. Links are voted on like everything else. A wiki-style reputation
   system (trusted users whose votes and edits weigh more) is planned for
   later and must not be blocked by early decisions.
4. **Everyone votes up or down.** One vote per account per item. Flags, not
   downvotes, are the path for content that is wrong or abusive. Reputation
   weighting comes later.

## Dialects

Dialects form a two-level tree so entries can be tagged at whichever level the
contributor is sure of. Launch set, following the main groups on Wikipedia's
"Varieties of Arabic":

| Group (top level)      | Sub-dialects (second level)                         |
|------------------------|-----------------------------------------------------|
| مصري (Egyptian)        | قاهري، صعيدي، إسكندراني                              |
| شامي (Levantine)       | سوري، لبناني، فلسطيني، أردني                         |
| خليجي (Gulf)           | كويتي، بحريني، قطري، إماراتي، عماني، شرق السعودية    |
| نجدي (Najdi)           | —                                                    |
| حجازي (Hejazi)         | —                                                    |
| يمني (Yemeni)          | صنعاني، عدني، حضرمي                                  |
| عراقي (Iraqi)          | بغدادي، موصلي، بصراوي                                |
| سوداني (Sudanese)      | —                                                    |
| مغاربي (Maghrebi)      | مغربي، جزائري، تونسي، ليبي                          |
| حساني (Hassaniya)      | —                                                    |

The list is data, not code. Adding or splitting a dialect is a content change.
Three historical varieties (أندلسي، صقلي، مالطي) are seeded as inactive rows so
they have a place if the dictionary ever reaches back that far.

## Search

Arabic search must ignore spelling variation. Before indexing and before
matching a query, text is normalised:

- strip tashkeel (U+064B–U+0652, U+0670) and tatweel (U+0640)
- أ إ آ ٱ → ا
- ة → ه
- ى → ي
- ؤ → و and ئ → ي

The original spelling is always stored and displayed; only the index is
normalised. Search covers MSA headwords and dialect forms, by substring first
and by trigram similarity when nothing matches (the «هل تقصد» suggestions).
Example text is not searched.

## Out of scope for the first version

Mobile app, public API, audio pronunciations, and the reputation system. The
data model leaves room for all of them.

AI-generated content was out of scope until 2026-09-24. Since then a language
model may draft forms, definitions and notes for the seed, under conditions
recorded in `seed/SOURCES.md`: the maintainer reads every draft, each file
passes `check-variety`, and no example sentence is ever invented. Examples are
what real people say, or nothing.

## Stack

Nuxt 4 (Vue 3, RTL layout from day one) with its built-in Nitro server for
the API, Drizzle ORM over PostgreSQL. Locally the database is PGlite, an
embedded Postgres stored under `.data/`, so nothing needs installing. In
production `DATABASE_URL` points at a PostgreSQL container on the same
server. Search uses normalised text columns in Postgres with a trigram index
(`pg_trgm`, migration 0005); Meilisearch is the upgrade path, with a trigger in
ROADMAP.md. Auth via nuxt-auth-utils: email and password with verification,
plus Google. Hosting on a netcup server in Nuremberg, deployed with Coolify
(see the README's Production section).

## Order of work

The detailed plan with schema changes and endpoints per phase is in
[PLAN.md](PLAN.md). The original order, kept for the record:

1. ~~Data model and migrations (see DATA_MODEL.md).~~ done
2. Seed the dialect tree (done) and a few hundred words with entries in three
   or four dialects. An empty dictionary has no reason to exist.
3. ~~Read-only site: word page, dialect page, search.~~ done (first cut)
4. ~~Voting.~~ built for logged-in users, then hidden from the pages until it
   is a feature again (see the README's Status).
5. ~~Accounts and contribution: add word, add entry, add example, propose link.~~ done
6. ~~Flagging and a minimal moderation queue.~~ done
