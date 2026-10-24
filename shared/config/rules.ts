/**
 * The numbers that decide how Lahga behaves, in one place (docs/ROADMAP.md B1).
 *
 * Each says what changes when it changes. The server and the pages both read
 * from here, so a rule is one edit, not a hunt through twenty files. Layout
 * numbers (share-card geometry) and plumbing (retry pauses, lock ids) stay in
 * the files they belong to: this is for what a maintainer would want to tune.
 *
 * tests/unit/rules.test.ts checks that the rules fit together.
 */

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// ---------- Games ----------

/**
 * كلمة اليوم: how many dialect forms a round reveals, one per wrong guess. Also
 * the most guesses a player has, the length of the share squares and the cap on
 * the result card. A word with fewer dialect groups than this reveals fewer.
 */
export const REVEALS = 6

/**
 * كلمة اليوم: how close a guess must be to the headword to count, as trigram
 * similarity (0 to 1). Lower forgives more typos and also accepts more near-miss
 * words; 1 would demand the exact spelling after normalisation.
 */
export const GUESS_SIMILARITY = 0.6

/** كلمة اليوم: the admin pages warn when fewer days than this ahead have a curated word. */
export const DAILY_QUEUE_WARNING_DAYS = 14

/** من أي لهجة؟: rounds a day. The share card and the «جولة ١ من ٣» line follow it. */
export const QUIZ_ROUNDS = 3

/**
 * من أي لهجة؟: dialect groups to choose from in a round. A word only becomes a
 * round if at least this many groups have a confirmed form for it, so raising
 * it shrinks the pool of words the quiz can use.
 */
export const QUIZ_CHOICES = 4

// ---------- Content thresholds ----------

/**
 * How many dialect groups must say a word before it ranks on «الكلمات التي
 * تختلف عليها اللهجات» and can be a daily puzzle. With two groups any word
 * would score as perfectly divergent; raising it shortens both lists.
 */
export const MIN_GROUPS = 4

/** Words two dialects must share before their comparison page is indexed and listed. */
export const MIN_SHARED = 40

/** Words a sub-dialect needs before it is listed under its region (on /dialects, the sitemap, llms.txt). */
export const MIN_ENTRIES = 1

/** Net upvotes on a draft that take it off the «بحاجة إلى تحقق» list. */
export const CONFIRM_SCORE = 2

/** What a guest's answer on a draft counts next to a member's. 0 would ignore guests; 1 would trust them fully. */
export const GUEST_WEIGHT = 0.5

/** How long an account counts as new, and so falls under RATE_LIMITS.contributeNew. */
export const NEW_ACCOUNT_MS = 7 * DAY

// ---------- Rate limits ----------

export type RateRule = { limit: number, windowMs: number }

/**
 * How often one visitor (by IP) or one account may do each thing; past the
 * limit the server answers 429 «محاولات كثيرة، حاول لاحقاً». A sliding window,
 * kept in memory (server/utils/rateLimit.ts). Raising a limit lets more through
 * for everyone, bots included.
 */
export const RATE_LIMITS = {
  // Reading
  words: { limit: 240, windowMs: MINUTE }, // the word list API, per IP; the SSR fetches of a page view count too
  wordsSearch: { limit: 90, windowMs: MINUTE }, // a search term on top of that; one empty search costs two
  forms: { limit: 600, windowMs: MINUTE }, // form pages (/f/…), per IP
  shareCards: { limit: 120, windowMs: MINUTE }, // rendering a share image (/og/*), per IP

  // Games
  dailyGuess: { limit: 60, windowMs: HOUR }, // per IP
  quizGuess: { limit: 60, windowMs: HOUR }, // per IP

  // Contributing
  contribute: { limit: 20, windowMs: HOUR }, // adds and edits, per account
  contributeNew: { limit: 30, windowMs: DAY }, // on top, for an account younger than NEW_ACCOUNT_MS
  vote: { limit: 120, windowMs: HOUR }, // per account, votes and draft answers together
  guestVote: { limit: 60, windowMs: HOUR }, // a guest's draft answers, per IP
  flag: { limit: 20, windowMs: HOUR }, // per account
  searchReport: { limit: 10, windowMs: 10 * MINUTE }, // «أبلغ عن كلمة ناقصة», per IP
  contact: { limit: 5, windowMs: HOUR }, // the contact form, per IP

  // Accounts
  register: { limit: 5, windowMs: HOUR }, // per IP
  loginPerIp: { limit: 20, windowMs: 15 * MINUTE },
  loginPerEmail: { limit: 10, windowMs: 15 * MINUTE }, // stops guessing one account's password from many IPs
  verify: { limit: 20, windowMs: HOUR }, // per IP
  resendVerification: { limit: 3, windowMs: HOUR }, // per account; each one sends a mail
  resetRequestPerIp: { limit: 5, windowMs: HOUR },
  resetRequestPerEmail: { limit: 3, windowMs: HOUR }, // each one sends a mail
  reset: { limit: 10, windowMs: HOUR }, // setting the new password, per IP
} as const satisfies Record<string, RateRule>

// ---------- Cache durations ----------

/**
 * How long a rendered page is served from memory before it is rebuilt in the
 * background, in seconds (Nitro `swr`, read by nuxt.config.ts). Any content
 * change clears them all at once (server/plugins/page-cache-purge.ts), so these
 * only bound how stale a page gets from things that do not clear it: votes, the
 * random words on the home page, the day changing.
 */
export const PAGE_CACHE_SECONDS = {
  home: 60,
  word: 300,
  dialect: 300,
  form: 300,
  divergent: 900,
  daily: 300, // today's puzzle; it changes at midnight UTC, so a page up to this old may still show yesterday's
  dailyArchive: DAY / SECOND, // a past day never changes again
  games: 3600,
  quiz: 300,
  data: 3600,
} as const

/** Past this many cached pages the oldest are dropped. Searches on / are the unbounded part. */
export const PAGE_CACHE_MAX_ENTRIES = 2000

/** How old the downloadable data export (/data) may get before it is rebuilt. */
export const EXPORT_MAX_AGE_MS = HOUR

// ---------- Card and list limits ----------

/** Words on the home page and on a dialect page, drawn at random; the dice draw this many more. */
export const RANDOM_SAMPLE = 5

/** Results a search on the home page shows. */
export const SEARCH_RESULTS = 50

/** The dialect's best-supported forms that go into its page's meta description. */
export const DIALECT_DESCRIPTION_FORMS = 6

/**
 * Forms on a word's share card (/og/w/…), best-supported first. The card has a
 * fixed portrait height; past about this many the «تُقال» lines run off it.
 */
export const WORD_CARD_FORMS = 14

/** On a form page (/f/…): the other forms listed per meaning, and the phrases that use the form. */
export const FORM_PAGE_OTHERS = 16
export const FORM_PAGE_PHRASES = 12
