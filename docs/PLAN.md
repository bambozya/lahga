# Plan

Written 2026-09-18 from the vision described that day. It turns the vision into
phases that can each ship on their own. See [PROJECT.md](PROJECT.md) for the
product and [DATA_MODEL.md](DATA_MODEL.md) for the tables that exist today.

## The vision, in short

- Anyone can browse and search. An account is needed to contribute or vote.
- Login by email and password, or with an existing account (Google first;
  Facebook, GitLab, GitHub and Apple can follow).
- Users add words, entries, examples and links. They edit and delete only what
  they created. Examples can be added to anyone's word.
- Up and down votes on everything, plus a flag button for content that is wrong
  or abusive.
- Every dialect has a short description. Users can propose changes; an admin
  approves or rejects them.
- Only admins moderate. Moderation stays small until engagement justifies more.
- Later: audio clips, then images, dialect suggestions, phrases, reputation.

## Decisions taken

1. **Login to vote.** Anonymous voting from the original product doc is dropped
   for launch. It removes most vote abuse and simplifies the votes table.
2. **Revisions instead of edits in place.** An edit creates a new revision and
   the old one stays. Users get editing, admins get undo. This honours the
   original rule that nothing user-generated is destroyed.
3. **Audio before images, video never hosted.** Short clips recorded in the
   browser are small and low risk. Images go live only after approval. Video is
   embedded by link only.
4. **One proposal mechanism.** Dialect description changes, and later dialect
   suggestions, are rows in one `proposals` table with a pending, approved or
   rejected state and the admin who decided.
5. **Soft delete only.** Deleting sets `status = deleted`. A word cannot be
   deleted once other people have added examples, links or votes to it.

## Phases

Each phase ends with something visible on lahga.fyi. Estimates assume evenings
and weekends.

### Phase 1: accounts (2 weeks) — done 2026-09-18

Goal: a person can create an account, log in, and see their own profile.

Schema:
- `users`: add `password_hash text null`, `email_verified_at timestamptz null`,
  `avatar_url text null`, `bio text null`, `last_seen_at timestamptz null`,
  `deleted_at timestamptz null`.
- New `oauth_accounts` (user_id, provider, provider_user_id, created_at;
  unique on provider + provider_user_id).
- New `email_tokens` (user_id, purpose: verify | reset, token_hash, expires_at,
  used_at). Tokens are single use and expire after one hour.

Server:
- `nuxt-auth-utils` for sealed cookie sessions, password hashing and the OAuth
  handlers. Google first.
- Endpoints: register, login, logout, verify email, request reset, reset
  password, `GET /api/me`, `PATCH /api/me`, `DELETE /api/me`.
- Email through Brevo (transactional API). Templates: verify, reset, and a
  goodbye on deletion.
- Rate limits on register, login and reset: per IP and per email.
- Cloudflare Turnstile on the registration form.

Pages: `/login`, `/register`, `/verify`, `/reset`, `/u/[id]` (public profile),
`/settings` (name, email, password, connected accounts, delete account).

Done when: a stranger can register with email, confirm it, log out, log in
again with Google using the same email and land on the same account, and delete
the account, which anonymises their content instead of removing it.

### Phase 2: contribution (3 weeks) — done 2026-09-18

Goal: a logged-in user adds a word with an entry and an example, and the word
appears on the site.

Schema:
- New `revisions` (id, target_type, target_id, revision_no, data jsonb,
  author_id, reason text null, created_at). Every create and edit writes one
  row. The live tables hold the current version. (`current_revision_id` was
  dropped as redundant: the highest revision_no is the current one.)
- `words`, `entries`, `examples`, `word_entry_links`: add `updated_at`.
- `words`: add `kind` enum (word, phrase, proverb), default word.

Server:
- `POST /api/words` creates word, first entry and optional example in one
  transaction, so the site never shows a word without a dialect.
- `POST /api/entries`, `POST /api/examples`, `POST /api/links`.
- `PATCH` on each, owner only, writes a revision. `DELETE` on each, owner only,
  soft delete, refused when others have built on the row.
- Validation with a schema library on every body, with the Arabic script rule
  from `shared/utils/arabic.ts`.
- Email must be verified before the first contribution.
- Rate limits: contributions per user per hour, and a daily cap for accounts
  younger than a week.

Pages: `/add-word` becomes real; `/w/[id]/edit` for the word, inline forms on
the word page for entries and examples; contributions on the public profile;
`/w/[id]/history` per word.

Done when: a new user can add, edit and delete their own word, cannot touch
someone else's, and an admin can open a word's history.

### Phase 3: votes and flags (1 week) — done 2026-09-18

Goal: quality control by the community.

Schema:
- `votes`: drop `ip_hash` and the anonymous key format; `voter_key` becomes
  `user_id`. Keep the unique constraint on (target_type, target_id, user_id).
- `flags`: `reporter_key` becomes `user_id`; add `resolved_by`, `resolution`
  enum (dismissed, hidden, deleted).

Server:
- `PUT /api/votes` (idempotent: sets the user's vote to +1, -1 or 0) and
  recompute the target's `score`.
- `POST /api/flags`. One open flag per user per target.
- Ranking: Wilson lower bound for entries inside a word page (computed when
  the page is assembled; up and down counts live on the row). The front page
  stays "newest first" for now; a time-decayed ranking can come when there is
  enough voting to make it meaningful.

Pages: `VoteBox` wired up; a flag dialog with the reason list.

Done when: votes change ordering on a word page, a user cannot vote twice,
and a flagged item shows up for admins.

### Phase 4: moderation and proposals (2 weeks) — done 2026-09-18

Goal: admins can keep the site clean without touching the database.

Schema:
- New `proposals` (id, kind enum: dialect_description | new_dialect, target_id
  null, data jsonb, author_id, status enum: pending | approved | rejected,
  decided_by, decided_at, note text null, created_at).
- `dialects`: `description_ar` becomes the approved text; edits go through
  proposals.
- New `moderation_log` (actor_id, action, target_type, target_id, reason,
  created_at) so every admin action is on record.

Server:
- Admin endpoints: list open flags, resolve a flag, hide, restore, delete,
  revert to a revision, ban a user, decide a proposal.
- `POST /api/proposals` for users; a proposal is refused while the same user
  has one pending for the same target.

Pages: `/admin` (flags), `/admin/proposals`, `/admin/recent`, `/admin/users`;
a "propose a better description" form on each dialect page; a revert button
per revision on the history page for admins; "my proposals" in settings.
Users get `banned_at` and `ban_reason`; a banned user cannot log in or act.

Done when: a user proposes a new dialect description, an admin approves it, and
the dialect page shows the new text with the proposer credited.

### Phase 5: content and launch (2 weeks, in parallel with 3 and 4) — in progress

- Seed a few hundred words with entries in at least four dialects. Sources:
  the founder's own knowledge, friends per dialect, and existing public-domain
  word lists. Every seeded row is attributed to the «لهجة» system user.
  Done so far: the bulk importer at `/admin/import` (format in
  `docs/seed/FORMAT.md`) and a first draft of 37 everyday words with 300+
  entries in `docs/seed/words-draft.json`, awaiting the founder's review.
- ~~Trigram index (`pg_trgm`) on the normalised columns so search stays fast.~~ done
- Legal: Impressum (page exists with placeholders for the operator's name and
  address), terms already grant the site a licence to user content, privacy
  page rewritten for accounts, processors and retention, no non-essential
  cookies. Contact form sends email (needs `CONTACT_EMAIL`).
- Ops: offsite copy of the nightly backups to a German object storage (needs
  a bucket), error tracking, uptime check.
- ~~Remove the GitHub Pages snapshot once nobody needs the fallback.~~ done

Done when: the construction wording is gone, the front page has real content,
and a stranger can register and contribute.

### Phase 6: later, in this order

1. **Audio.** Record a short clip in the browser for an entry or example.
   Storage in S3-compatible object storage in Germany. Size and length caps.
   Published immediately, removable by flag.
2. **Images.** Same storage. Held for admin approval before they appear.
   No video hosting; a video is a link to an external page.
3. **Dialect suggestions.** Already a proposal kind; only the form and the
   tree-editing logic are new.
4. **Phrases and proverbs.** Filters and labels on the existing `kind` column;
   maybe their own list page.
5. **Reputation.** Vote weight by reputation, trusted users who can approve
   proposals. Only when volume makes admin-only moderation a bottleneck.
6. **More login providers** as users ask for them.

## What is deliberately not planned

Mobile app, public API, AI-generated content, a Wikipedia-style talk page per
word, and edit rights on other people's content. Any of these can be added
without undoing the phases above.
