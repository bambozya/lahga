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
2. **Open by default.** Anyone can browse, search, and vote without an account.
   An account is required to add words, entries, examples, and links. This may
   be revisited.
3. **Users link, votes decide.** Any user can propose that an entry belongs to a
   word. Links are voted on like everything else. A wiki-style reputation
   system (trusted users whose votes and edits weigh more) is planned for
   later and must not be blocked by early decisions.
4. **Everyone votes up or down.** One vote per person per item. Anonymous votes
   are tied to a signed browser token and rate-limited by IP. This is a known
   weak point; reputation weighting will later reduce the impact of abuse.

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

## Search

Arabic search must ignore spelling variation. Before indexing and before
matching a query, text is normalised:

- strip tashkeel (U+064B–U+0652, U+0670) and tatweel (U+0640)
- أ إ آ ٱ → ا
- ة → ه
- ى → ي
- ؤ → و and ئ → ي (configurable; may be too aggressive)

The original spelling is always stored and displayed; only the index is
normalised. Search covers MSA headwords, dialect forms, and example text.

## Out of scope for the first version

Mobile app, public API, audio pronunciations, AI-generated content, and the
reputation system. The data model leaves room for all of them.

## Stack

Nuxt 4 (Vue 3, RTL layout from day one) with its built-in Nitro server for
the API, Drizzle ORM over PostgreSQL. Locally the database is PGlite, an
embedded Postgres stored under `.data/`, so nothing needs installing. In
production `DATABASE_URL` points at a managed Postgres (Neon to start).
Search uses normalised text columns in Postgres; Meilisearch is the upgrade
path. Auth (planned) via nuxt-auth-utils: email magic link plus Google.
Hosting on Vercel or Netlify.
## Order of work

1. ~~Data model and migrations (see DATA_MODEL.md).~~ done
2. Seed the dialect tree (done) and a few hundred words with entries in three
   or four dialects. An empty dictionary has no reason to exist.
3. ~~Read-only site: word page, dialect page, search.~~ done (first cut)
4. Voting (anonymous and logged in).
5. Accounts and contribution: add word, add entry, add example, propose link.
6. Flagging and a minimal moderation queue.
