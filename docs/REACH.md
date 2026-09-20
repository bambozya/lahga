# Reach

Written 2026-09-19. How the site gets found and passed on. [PLAN.md](PLAN.md)
builds the dictionary; this builds the reasons to arrive at it and the reasons
to forward it. The phases below can each ship on their own, in the order given.

## The premise

A dictionary does not travel. Nobody forwards a lookup to a friend. What
travels in Arabic social space is an argument and a scoreboard: «المصريين
بيقولوا كذا والمغاربة بيقولوا كذا» is a conversation people enjoy having, and a
score is a thing people post. The site already owns the raw material for both —
one concept, many dialects, the divergence itself — and has no object built on
top of it that anyone can share.

So: do not try to make the dictionary viral. Build one shareable object on top
of it, make every link that leaves the site carry a picture, and let the
dictionary be what people land on.

Three separate jobs, often confused:

- **Search** brings strangers who have a question. Already served by the
  sitemap, the per-word titles and the JSON-LD. Needs more words, not more code.
- **Sharing** brings the friends of people who are already here. Needs an
  object worth sending, and a link that renders as something when sent.
- **Return** brings the same person back tomorrow. Needs a reason that renews
  itself daily. Nothing on the site does this today.

## Decisions taken

1. **The daily game is the shareable object.** Not a listicle, not a blog. A
   game renews daily, needs no login, and produces a score people post. It also
   uses the one thing only this site has: the same concept in many dialects.
2. **No account to play.** An account gate would kill the thing that makes it
   spread. Progress and streak live in the browser's local storage. Signing in
   to keep a streak across devices can come later and must not be required.
3. **The answer is checked on the server.** A puzzle whose answer sits in the
   page payload is solved by anyone who opens the developer tools, and the
   first screenshot of the payload ends the game. One request per guess.
4. **Images, not links, are the unit of sharing.** WhatsApp is where this
   content moves, and WhatsApp moves pictures. Every shared thing gets a
   rendered card; the link is the fallback, not the plan.
5. **Cards are hand-written SVG rasterised by resvg, not satori.** Satori
   shapes Arabic badly (letters come out disconnected, unjoined). resvg uses
   rustybuzz and shapes Arabic correctly. The cost is writing the SVG by hand
   instead of in JSX, which for a fixed 1200×630 layout is no real cost.
6. **Measure before and after.** No analytics exists today, so nothing below
   can be judged. It ships first, and it ships cookie-free so the privacy page
   and the no-banner promise stay true.

## Phase R1: measurement (half a day)

Nothing here is visible to visitors, and everything after it is guesswork
without it.

- Self-hosted Plausible or Umami on the netcup box, through Coolify, on a
  subdomain. Both are cookie-free and count without identifying, so no consent
  banner and no change to [privacy](../app/pages/privacy.vue) beyond naming the
  processor (which is us).
- One script tag in `nuxt.config.ts`, loaded from our own domain so blockers
  that key on the vendor's hostname do not remove it.
- Mark the events that matter: a search that returned nothing (the clearest
  signal of what to seed next), a share, a game finished, a word page reached
  from an outside link.

Done when: the dashboard shows yesterday's visitors, their entry pages and
their referrers, and the empty-search list can be read.

## Phase R2: the card renderer (2–3 days)

Every `/w/…` link shared today renders the same grey `public/og.png`. It should
render the word and its dialect forms, so the preview is already the content.

Server:
- `GET /og/w/[id].png` — 1200×630, built as an SVG string from the same data
  `/api/words/[id]` returns, rasterised with `@resvg/resvg-js`. Ink on paper,
  the accent red, the nuqta mark: the tokens in `main.css`, hard-coded, since
  the card has no CSS cascade to read them from.
- Layout: the MSA headword large in Naskh, the definition under it small, then
  up to six dialect forms with their dialect names, then `lahga.fyi` in the
  corner. Fewer forms, larger type — the card is read at thumbnail size in a
  chat list.
- Cache hard: `max-age` a day, keyed by the word's `updatedAt`, plus an
  in-process LRU of a few hundred rendered buffers. Rasterising on every
  crawler hit is the one way this becomes an outage.
- Fonts: resvg's font database reads ttf/otf, not the woff2 under `public/fonts`.
  Add ttf copies of Amiri and IBM Plex Sans Arabic under `server/assets/fonts`
  (not `public/`, they are not for browsers) and load them into the renderer.
- Packaging: `@resvg/resvg-js` is a native binding. It needs to be in the nitro
  externals beside `@electric-sql/pglite` so the binary lands in `.output` and
  the slim runtime stage in the `Dockerfile` still has it. `node:22-slim` is
  glibc, so the prebuilt `linux-x64-gnu` binary is the right one and nothing
  needs compiling.

App:
- `useSeo` takes an optional `image`, and the word page passes its own card.
  Dialect pages get one too (`/og/d/[slug].png`): the dialect name, its
  description, its word count.

Done when: pasting a word link into WhatsApp shows the word and its dialect
forms, and the first paste is not slower than the second.

## Phase R3: the daily game (1–2 weeks)

**«كلمة اليوم»** — one word a day, revealed one dialect at a time.

The shape, borrowed from Heardle and Framed because it is proven and because it
happens to fit the data exactly: the puzzle opens with the word as one dialect
says it — the most divergent dialect first, the one that gives least away. Guess
the MSA word it means. A wrong guess or a pass reveals the next dialect's form,
which makes it easier. Six reveals, then the answer. The score is how few forms
you needed.

Why this and not «guess the dialect»: too many words are said the same way in
neighbouring dialects, so the answer would often be arguable, and an arguable
answer in a daily game is a complaint, not a share. Guessing the MSA headword
has exactly one right answer, and the site is built around that headword being
the hub.

Schema (one new table, no change to existing ones):
- `daily_puzzles`: `id`, `date` (unique), `word_id`, `reveal_order` (the entry
  ids in the order they are shown), `created_at`. Curated by an admin screen a
  few weeks ahead rather than drawn at random, so a dud word can be swapped and
  a word is never repeated. A fallback picks the most divergent unused word if
  the queue runs dry.

Server:
- `GET /api/daily` — today's puzzle: the forms up to the reveal the client says
  it has reached, the dialect names, and no answer anywhere in the payload.
- `POST /api/daily/guess` — a guess, checked with `normalizeArabic` and the
  existing trigram similarity, so a near miss in spelling still counts and a
  synonym does not. Returns right or wrong and the next form on a wrong guess.
- Yesterday's puzzle stays playable at `/daily/[date]` and is indexed: it is
  a page of real content with a link to the word.

App:
- `/daily` — the game. No account, state in local storage (today's progress,
  streak, the dates played). The page works without JS to the extent of showing
  the first form and a real form to submit a guess.
- The end screen is the funnel: the answer, its dialect forms, and a link
  through to the word page. A player who finishes has just learned six dialect
  words and is one click from the dictionary.
- The share: the emoji grid, spoiler-free, in Arabic — `كلمة اليوم ٢٥ · ٣/٦`
  and the squares — copied to the clipboard, plus a rendered card image from
  the Phase R2 renderer for people who post pictures rather than text.
- A link in the header, and a line on the home page under the shuffled words.

Done when: a stranger can play today's puzzle with no account, cannot find the
answer in the payload, and gets a score they can paste into a chat.

## Phase R4: the divergence pages (3–4 days)

The words where dialects disagree most are the site's most interesting content
and are currently no easier to find than any other word. They are also, per the
content rule, the only words that earn a page at all — so this is a ranking of
the dictionary by its own standard, not a new kind of content.

- A divergence score per word: distinct normalised forms across dialect
  *groups*, over the number of groups that have an entry. Computed in SQL,
  cached for an hour; a stored column only if it turns out to be slow.
- `/divergent` — «الكلمات التي تختلف عليها اللهجات أكثر», ranked, with each
  word's forms shown inline so the page is readable without clicking. This is
  the page that gets screenshotted, so it gets its own card.
- Dialect-to-dialect pages, `/d/[a]/vs/[b]`: the words these two say
  differently, side by side. Generated only for pairs with at least forty
  shared words, `noindex` under that, so the site never grows a field of thin
  pages that drag the rest down in search.

Done when: `/divergent` reads well enough to post on its own, and the ten
listed pairs each have something on them.

## Phase R5: Arabic word URLs (2–3 days)

`/w/123` says nothing in a chat preview and nothing in a search result.
`/w/سيارة` says the word — browsers and WhatsApp render the Arabic even though
the href is percent-encoded.

- `words.slug`, unique, from the normalised headword, with `-2` on collision.
  Backfill for the existing rows.
- `/w/[slug]` becomes the page; `/w/[id]` answers with a 301 to it, forever,
  because links already exist in the wild. Sitemap and canonical follow the
  slug.
- Entries keep no slug: they are reached through their word.

Done when: every old numeric link still lands, and the sitemap carries slugs.

## Phase R6: surviving the arrival (1 day, before any push)

Nothing on the site is cached. Every page view is a database query, and the
Coolify box is one small VPS. A spike that works is worse than one that never
comes if the site is down while it happens.

- `routeRules` with stale-while-revalidate on `/w/**`, `/d/**`, `/divergent`
  and the home page. The catch: those pages render edit and delete buttons for
  the signed-in author, and a cached anonymous render must never be served to a
  signed-in user or the reverse. Either vary the cache on the session cookie's
  presence, or move the per-user controls to client-side rendering and cache
  one public copy. The second is cleaner and faster for the anonymous majority,
  which during a spike is nearly everyone.
- The card renderer gets its own cache headers, checked under load.
- An uptime check and error tracking (both already listed in PLAN.md Phase 5)
  actually wired up, so a bad night is noticed at night.

Done when: `/w/…` and `/daily` serve from cache for a signed-out visitor, a
signed-in author still sees their buttons, and a few hundred concurrent
requests do not move the database.

## The content, which is the real constraint

504 words and roughly 8,000 entries across 21 dialects. That is enough for the
game (one word a day for well over a year) and enough for the cards. It is not
enough for a traffic spike: a few thousand strangers arriving and searching for
the first word in their head will mostly find nothing, and people do not come
back to a site that failed them once.

So the content grows in parallel with everything above, and no distribution
push happens before it does. The target before any push is a few thousand
words, and the priority order comes from the site itself: the empty-search log
from Phase R1 is a list, written by visitors, of exactly which words are
missing. Seed those first.

The content rule stands and does the filtering: a word earns a page only if
dialects say it differently. A thousand words that all agree would add nothing
to the divergence pages and nothing to the game.

## Distribution, which is not code

The site will not distribute itself, and none of the above is a plan for
getting the first thousand people. That part is outside this repository, but it
determines whether the rest was worth building:

- **Short vertical video** — TikTok and Reels. One concept, six dialects, ten
  seconds, the words on screen. This format already spreads in Arabic without
  help, and the site is the source for it and the link in the bio. This is the
  main channel; the others are rounding.
- **The game's own share** is the second channel and costs nothing per post.
- **Arabic learners** — r/learn_arabic, the learner Discords, the teachers on
  Instagram. Small, warm, and they link to tools they use.
- **Dialect pride** is the engine on all of them. People show up to argue that
  their village says it differently, and an argument is an entry waiting to be
  added. The contribute path should be one click from every disagreement.

## What is deliberately not planned

Paid acquisition, an email newsletter, a blog, cross-posting bots, an app, and
anything that needs a login to try. Also: no AI-written words to pad the count.
The dictionary's only claim is that real people say these things, and a spike
that arrives to find invented content is the one failure that cannot be undone.
