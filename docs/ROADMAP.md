# Roadmap

Written 2026-09-21. [PLAN.md](PLAN.md) built the dictionary and
[REACH.md](REACH.md) built the reasons to visit it. Both are shipped. This
document is about what comes after a fast first week: making the site hard to
lose, cheap to change, and worth contributing to.

It is organised differently from the two before it, on purpose. See "How this
plan bends" before reading the tracks.

## Where things stand

Measured on 2026-09-21, from the repository and the live site.

**The product.** Live at lahga.fyi and healthy. Accounts, contribution with
revisions, votes, flags, admin area, trigram search, share cards, two daily
games, the divergence ranking, dialect-versus-dialect pages, Arabic word URLs,
cached public pages, cookie-free analytics. 108 commits in seven days.

**The content.** 484 headwords, 8,570 entries, 2,459 examples in the seed
files; the live sitemap lists 555 URLs.

- A typical word covers 13 dialects and all 10 top-level groups. This is
  strong.
- Almost everything is tagged at group level (مصري، عراقي، خليجي). 12 of the
  33 sub-dialects have no entries at all: صعيدي، إسكندراني، بحريني، قطري،
  عماني، شرق السعودية، صنعاني، عدني، حضرمي، بغدادي، موصلي، بصراوي. Seven more
  have under 50.
- 28% of entries have an example. 20 words have none. 31 words have no
  definition. No row is marked as a proverb, although a sayings file exists.
- 7,278 Palestinian-only words and 11 Jordanian-only words wait in
  `docs/seed/candidates/`. By the content rule, one dialect's form is not a
  page, so they cannot be imported as they are.

**The engineering.** Built fast, and that was the right call. What speed left
behind:

- No tests, no CI, no linter. `nuxt typecheck` exists and nothing runs it.
- No error tracking and no outside uptime check. A failure at night is found
  by a visitor.
- Backups are nightly, and they live on the same server as the database.
- If the database is unreachable for a moment while the app starts, the app
  remembers the failure and answers 500 to everything until someone restarts
  it (`server/db/index.ts`).
- The rate limiter has a bug: hourly and daily limits are in practice trimmed
  to 15 minutes (`server/utils/rateLimit.ts`, the sweep uses the wrong
  window). Search and the share-card images have no limit at all.
- The page cache never forgets and never gets told about edits. An entry an
  admin hides can stay visible, and odd URLs (`/w/x?n=1`, `?n=2`, …) grow
  memory without bound.
- Small tweaks are expensive. Game rules, rate limits and thresholds are
  magic numbers across about 20 files. The accent colour lives in CSS, again
  in the share cards, again in the emails, and the favicon uses a different
  red altogether. The two games are near copies of each other.

**What is not known.** How many people have registered, and whether anyone
outside the founder has contributed. The admin page shows totals for today
only. Every community decision below depends on these numbers.

## The premise

The next level is not more features. Three things hold the site back, in this
order:

1. **It can be lost, and it can fail silently.** One disk failure takes the
   database and its backups together. Nothing tells anyone when the site is
   down.
2. **Change is more expensive than it should be.** Every tweak touches many
   files and nothing checks the result. That is what makes a solo project
   slow down and then stop.
3. **The dictionary has one voice.** Nearly all content was seeded by us. The
   contribution loop is built but unproven, and the site's promise is that
   real people say these things.

So: secure it, make it cheap to change, then turn visitors into contributors.
Distribution (REACH.md) comes after the first of these, not before.

## How this plan bends

The earlier plans were numbered phases. That works when the work is known.
From here on it is not, so:

- **Tracks, not phases.** Five tracks that do not depend on each other except
  where an item says so. Any track can pause without blocking the rest.
- **Now, Next, Later.** Only *Now* is a commitment. *Next* is the current best
  guess. *Later* items carry a **trigger** instead of a date: a measurable
  condition that says when the item becomes worth doing. Until the trigger
  fires, it is not work.
- **Every item stands alone.** Each has a reason, a size and a "done when".
  Dropping one never breaks another.
- **Changing your mind is cheap.** New decisions go in the decision log at the
  bottom as one line with a date. Items move between horizons by cut and
  paste. The document is never rewritten.
- **A review every four weeks.** Half an hour, described near the end. It is
  what keeps this file true.

Sizes assume evenings and weekends, as in PLAN.md.

## Decisions taken

1. **Foundation before growth.** No distribution push until Track A *Now* is
   done. A spike that finds the site down, or a lost database, cannot be
   undone.
2. **One server, one process, no new moving parts.** No Redis, no queue, no
   second instance. What is kept in memory gets bounded, not distributed.
   The trigger to revisit is in Track A *Later*.
3. **Tests guard the rules, not the pages.** Unit tests for the pure functions
   that encode the site's rules, plus one smoke test that boots the app. No
   coverage target, no component tests.
4. **One source of truth per tweakable thing.** A rule lives in one file. A
   colour lives in one file. Everything else reads from there, and a test
   fails when a copy drifts.
5. **Depth before count.** Finish the 484 words (examples, definitions,
   sub-dialects) before chasing thousands. New words come from what visitors
   searched for and did not find, not from a target number.
6. **Sub-dialects are for the community, not for seeding.** We do not know
   how Basra differs from Baghdad; people from Basra do. The empty corners are
   the invitation.
7. **The games can be cheated by their own player, and that is accepted.** A
   game with no account cannot stop someone passing six times to read the
   answer. The server protects two things only: the answer is not in the page,
   and a guess is checked against the right day's word.

## Track A: foundation

Goal: the site cannot be lost, and cannot fail without someone knowing.

### Now

**A1. Backups that leave the building, and a restore drill** (half a day,
after you provide a bucket). Coolify can send its nightly dump to any
S3-compatible storage. *Done when:* last night's dump has been downloaded to
the Mac, restored into a scratch Postgres, and the site runs against it. A
backup nobody has restored is a hope, not a backup. The same bucket later
serves audio (Track E).

**A2. A start-up that heals itself** (half a day). Do not remember a failed
database connection; retry with a growing delay. Take a Postgres advisory lock
around migrations, because during a deploy the old and new containers briefly
run together. *Done when:* restarting the database container while the app is
up ends in a working site with no manual restart.

**A3. Eyes** (half a day). Two parts:
- Errors: a Nitro error hook that emails the admin through Brevo, at most once
  per distinct error per hour. No new service to run. Upgrade to a self-hosted
  GlitchTip only if the emails become noise.
- Uptime: a check from **outside** the server, because a monitor on the same
  machine dies with it. Which service is your call (see "Needs from you").

*Done when:* a deliberately thrown error reaches your inbox, and stopping the
app container produces an alert within five minutes.

**A4. A cache that forgets, and listens** (1 day). Ignore unknown query
strings in the cache key, cap how long stale pages may be served, cap the
number of entries. Purge the word's and dialect's pages after an edit, a
hide, a revert or an import. *Done when:* an entry hidden by an admin is gone
from the public page within a minute, and ten thousand requests with random
query strings do not grow memory.

**A5. Limits that mean what they say** (half a day). Fix the sweep so each key
keeps its own window. Add limits to search and to the share-card routes (each
card render blocks the server while it draws). Validate query parameters:
cap the length of `q`, clamp `limit`. *Done when:* a test proves an hourly
limit lasts an hour, and `?limit=-5` answers 400 instead of 500.

**A6. A safety net** (1 day, then a habit). Vitest on the pure rules:
`normalizeArabic`, `slugify`, `isArabicOnly`, `echoesWord`, `wilson`,
`groupByRegion`, the daily date helpers, the rate limiter, the LRU, and the
divergence score and guess matching once B1 has pulled them out. One smoke
test boots the app on PGlite and fetches six pages. A GitHub Action runs
typecheck and tests on every push. *Done when:* a failing test is visible
before a deploy. (Blocking the deploy itself is in *Next*.)

**A7. A guess knows its day** (2 to 3 hours). The client sends the puzzle's
date with each guess; the server checks the guess against that day's word and
refuses dates other than today and yesterday. Fixes wrong results around
midnight UTC in both games. Reveals re-check that the entry is still visible.

**A8. Housekeeping** (1 hour). Change the netcup root password if that has
not happened yet. An alert on the admin page when the curated daily queue
drops under 14 days.

### Next

- **Deploys wait for tests.** Coolify deploys from a CI step instead of the
  GitHub push webhook. Only after A6 has been quiet for two weeks.
- **Precomputed rankings.** Divergence scores, dialect pairs and group counts
  move into a table refreshed after imports and hourly. The sitemap is cached
  on the server.
- **Content-Security-Policy,** report-only first, enforced when the report is
  clean.
- **Small debts:** `tidy` writes revisions; trigram indexes declared in
  `schema.ts`; timing-safe token comparison; a password reset ends other
  sessions; pagination on dialect pages.

### Later, with triggers

- **Rate limits in Postgres, then a second instance.** Trigger: CPU above
  70% for an hour on a normal day, or a deploy needs zero downtime.
- **Meilisearch.** Trigger: search slower than 300 ms at the median, or
  people ask for typo tolerance trigram cannot give.
- **Structured logs.** Trigger: a bug that could not be traced from the error
  emails.

## Track B: cheap to change

Goal: a small tweak is a one-line change that a test confirms. This track is
what "flexible" means in practice.

### Now

**B1. One rules file** (1 day). `shared/config/rules.ts`: game rules
(reveals, rounds, match thresholds, attempts), the rate-limit table, content
thresholds (minimum forms, minimum shared words for a pair page), cache
durations, card limits. Named constants, each with a comment saying what
changes when it changes. Validators and handlers import from it. *Done when:*
changing the daily game from six reveals to five is one line, and the tests
still pass.

**B2. One palette** (half a day). `shared/tokens.ts` holds the colours. The
share cards and emails import it. `main.css` keeps its own copy, because CSS
should stay plain CSS, and a test reads the file and fails if it disagrees.
The favicon is corrected to the real accent. *Done when:* changing the accent
is two edits and the test tells you if you forgot one.

**B3. A game kit** (2 days). One `useGameProgress(key)` composable with a
version number in the stored shape, a migration step, and a cap on history.
One share component, one result component. The repeated `.head` block and
accent panel move into `main.css`. Along the way: the archive page stops
saying «خمّنتها» for a lost game, the streak is finally shown, and a quiz
round survives a refresh. *Done when:* a third game would be one page and one
endpoint with nothing copied.

**B4. Server helpers** (1 day). One `rows()` helper instead of eight copies
of the same guard. `cardEntries` and the group mapping extracted. Shared
validators for route and query parameters. Constants move out of handler
files so utilities stop importing from routes.

### Next

**B5. Accessibility pass on the games and forms** (1 day). A live region that
exists before the feedback does, focus moved after each guess, the six
`href="#"` links become buttons, 44px touch targets, `ThemeSwitch` survives a
private window, the result image's alt text states the score.

**B6. Docs that match the code** (half a day). README and DATA_MODEL brought
up to date. A short `docs/HOWTO.md` with five recipes: add a dialect, add a
game, change a rule, add a source, ship a migration. Written for you six
months from now.

## Track C: content

Goal: every page that exists is complete, and new pages answer real demand.
The content rule stands: a word earns a page only if dialects say it
differently, no line repeats the word it hangs under, and nothing is
AI-written.

### Now

**C1. Finish what exists** (a few evenings).
- The 20 words with no example and the 31 with no definition.
- The 10 rows `check-variety` still flags: fix or retire each.
- Mark the real proverbs in the sayings file as `proverb`, so that kind can
  become a filter.

**C2. The weekly miss list** (a habit, not code). Once a week, open
`/settings/admin/search-misses`, take the words people looked for, run them
through `check-variety`, seed the ones that pass. *Done when:* it has happened
four weeks in a row.

### Next

**C3. Examples where people look.** Raise example coverage from 28% towards
50%, starting with the most-viewed word pages in Umami rather than in
alphabetical order.

**C4. The next open source.** The candidates need a second and third dialect
to become pages. Tharwa, DiaLEX and MADAR are ruled out or unconfirmed
(`seed/SOURCES.md`). Finding an openly licensed Egyptian, Gulf, Iraqi or
Maghrebi lexicon is a research task with an uncertain result, which is why D3
exists as the other way to complete them.

### Later, with triggers

- **Proverbs as their own list.** Trigger: 50 rows marked `proverb`.
- **A few thousand words before a push** (REACH.md's target) stays the goal.
  It is reached through C2, C4 and Track D, not through a seeding sprint.

## Track D: the community loop

Goal: a visitor who knows a word we lack can give it to us in under a minute.
Today the login wall appears before the form does (`ContributeGate.vue`).

### Now

**D1. Know the numbers** (half a day). The admin page gains weekly figures:
registrations, verified accounts, contributions by people other than the
system user, votes, flags. *Done when:* you can say how many strangers
contributed last week. Everything below is sized by that answer.

### Next

**D2. «كيف تقولها في لهجتك؟»** (2 to 3 days). On a word page, a visitor picks
their dialect once (remembered in the browser). If that dialect has no entry
for the word, the page asks for it with one field. The form comes first and
the account second: what they typed is kept through login or registration and
submitted after. *Done when:* a signed-out stranger can go from a word page to
a submitted entry without retyping anything.

**D3. The workshop** (3 to 4 days, needs D1 to show there is anyone to use
it). The Palestinian-only candidates become a queue at a `noindex` page:
«الفلسطيني يقول كذا، فكيف تقولها أنت؟». A candidate is promoted to a real word
automatically once it has three different forms from different groups. First,
filter out the 3,043 candidates whose form equals the headword, which are
unlikely to diverge. This turns the content rule from a wall into a task.

**D4. Empty corners ask for help** (half a day). The dialect page already
shows sub-dialects with nothing in them. Each gets a line: «من البصرة؟ أضف
أول كلمة». Follows decision 6.

### Later, with triggers

- **Recognition:** counts on the profile, «أول من أضاف من البصرة». Trigger: 20
  contributors.
- **Email when your entry gets votes.** Trigger: 50 contributors; needs an
  unsubscribe link and a privacy page update.
- **Reputation and trusted users** (PLAN.md 6.5). Trigger: more than 20 open
  flags or proposals per week for a month.

## Track E: product

Nothing here is *Now*. The site has enough features for its content.

### Next

- **Installable** (half a day): a web manifest and icons, so the daily game
  can sit on a home screen. No service worker yet.
- **My dialect** (comes with D2): the chosen dialect is listed first on word
  pages.
- **Midnight where you are** (half a day on top of A7): the game rolls over at
  the player's local midnight instead of 02:00 or 03:00 in Cairo and Riyadh.
  The server accepts today's date plus or minus one. A product decision; see
  "Needs from you".

### Later, with triggers

- **A third game.** Trigger: B3 is done and the two games bring back more than
  a fifth of their players the next day.
- **Audio** (PLAN.md 6.1). Trigger: the bucket from A1 exists and 20
  contributors are active.
- **Sign in to keep a streak across devices.** Trigger: people ask.

## Distribution

Unchanged from REACH.md, and still not code. The gate is decision 1: Track A
*Now* done, and the miss list habit running. Short video remains the main
channel.

## A suggested order

| Weeks | Work |
|---|---|
| 1 and 2 | Track A *Now*, A1 to A8. C1 in the gaps. |
| 3 | B1, B2, B3. D1. |
| 4 | B4. First review. |
| 5 onward | Alternate: one week content (C2, C3), one week community or product (D2 first). |

If a week goes missing, nothing breaks. Pick up the next item in any track.

## Needs from you

1. **A bucket** for offsite backups, from a host that fits your hosting rule.
   S3-compatible is the only technical requirement. Everything in A1 waits
   for this.
2. **Where the uptime check runs.** It must be outside the netcup server. A
   hosted service you are comfortable with, or the smallest VPS elsewhere
   running Uptime Kuma.
3. **Local midnight for the games:** yes or no.
4. **The workshop (D3):** whether incomplete words may be shown to visitors at
   all, even on a page search engines cannot see.

None of these blocks A2 to A8 or Track B.

## The review, every four weeks

Half an hour, with four things open: Umami, the search-miss list, the admin
numbers from D1, and this file.

1. Did any trigger under *Later* fire? Move the item to *Next*.
2. Is *Now* empty in a track? Pull from *Next*.
3. Did something on the list stop mattering? Delete it and say so in the log.
4. Write one line in the decision log.

## What is deliberately not planned

A mobile app, a public API (the bulk files under /data are a download, not
an API — docs/DISCOVERY.md), AI-written content, paid acquisition, a
newsletter, Redis or any second service in front of the app, a rewrite of the
classless CSS into a component library, component tests, and an i18n layer.
The site is Arabic only, and inline Arabic strings are the right amount of
machinery for that.

## Decision log

Newest first. One line each.

- 2026-09-25. Seed data files leave the repository and its history; only the
  notes under docs/seed stay tracked. The seed lives on the maintainer's
  machine and in the live database.
- 2026-09-24. Roadmap mirrored as GitHub issues #1 to #41, one per item,
  milestones Now / Next / Later, one label per track.
- 2026-09-24. Code licensed AGPL-3.0; content stays CC BY-SA 4.0.
- 2026-09-24. Language-model drafts allowed for the seed, under conditions
  (seed/SOURCES.md): the maintainer reads every draft, check-variety passes,
  no example is ever invented. Amends "nothing is AI-written" under Track C.
- 2026-09-23. The two questions under "Needs from you" that gate A1 and A3
  are answered: backups go to a Scaleway bucket in Paris (2026-09-22), the
  uptime check is a Cloudflare Worker in ops/uptime (2026-09-23). A1, A2, A4
  and A5 shipped on 2026-09-22; A3's error emails are still open.
- 2026-09-21. Roadmap written. Tracks replace phases; foundation before
  growth; sub-dialects left to the community; game self-cheating accepted.
