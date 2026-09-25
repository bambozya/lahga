# لهجة — Lahga

قاموس اللهجات العربية بمشاركة المستخدمين.

A user-driven dictionary of Arabic dialects. Every dialect word is linked to a
Modern Standard Arabic headword, so the site can show how the same idea is said
across the Arab world.

- **Live site:** https://lahga.fyi
- **Product description:** [docs/PROJECT.md](docs/PROJECT.md)
- **Database design:** [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- **Plan:** [docs/PLAN.md](docs/PLAN.md), phase by phase
- **What comes next:** [docs/ROADMAP.md](docs/ROADMAP.md)

## Status

The site is live with accounts, contributions, flags and an admin area
(phases 1 to 4 of the plan). Voting is built (API, scores, `VoteBox`) but hidden:
nothing mounts the component and no page mentions it, until it is a feature again. Phase 5, launch, is in progress: seed content,
legal pages, offsite backups.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database setup is needed: without a
`DATABASE_URL` the server uses an embedded Postgres (PGlite) stored in
`.data/`, applies the migrations, and seeds the dialect tree plus a few sample
words on first start. Delete `.data/` to start fresh.

Locally an admin account is created on start (`admin@lahga.test` /
`lahga1234`, or your own values via `DEV_ADMIN_*` in `.env`), because
verification emails are only printed to the terminal in development.

Node 22 or newer. Production runs on Node 22 (see the `Dockerfile`).

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production server build into `.output/` |
| `npm run preview` | Run the production build locally |
| `npm run db:generate` | Create a migration from schema changes |
| `npm run db:migrate` | Apply migrations to the database in `DATABASE_URL` |
| `npm run db:studio` | Browser UI over the database |

## Project layout

```
app/                Vue side (Nuxt 4)
  layouts/          header, nav, footer
  pages/            one file per route: /, /browse, /dialects, /w/[id], /d/[slug], account, admin, static pages
  components/       AppLogo, WordCard, EntryCard, VoteBox, FlagButton, forms, admin pieces
  middleware/       auth, guest, admin route guards
  assets/css/       main.css (the design), scale.css (fluid type and space), fonts.css
  error.vue         the error page
shared/utils/       code used by both client and server (Arabic normalisation)
server/
  api/              HTTP endpoints, one file per route; /api/admin/* for admins; /api/health for the container
  db/               Drizzle schema, connection, migrations on startup, seed data
  utils/            session, validation, rate limits, email, tokens, contribution and admin helpers
  plugins/          runs at startup (opens the database; drops the session cookie for anonymous visitors)
drizzle/            generated SQL migrations, committed
public/             favicons, robots.txt, self-hosted fonts
docs/               product and data-model docs
Dockerfile          the production image
docs/seed/          seed content format and sources; the data files themselves are kept out of the repository
```

## Design

The design is called Nuqta: ink, paper and one colour. It is documented at the
top of `app/assets/css/main.css`.

- **Classless.** Elements are styled by what they are, so the markup has to be
  honest: the feed is a `<dl>`, a dialect tag is `<a rel="tag">`, an example is
  `<q>`, a date is `<time>`, the vote score is `<output>`, the search box is
  `<search>`.
- **The brand mark is the nuqta**, the rhombic dot of the jeem in the logo
  (`AppLogo.vue`). It is the only decoration and always uses `--accent`.
- **Two type voices.** IBM Plex Sans Arabic speaks for the site, Noto Naskh
  Arabic for the words of the dictionary. The logo is Amiri Bold, outlined as
  SVG. All fonts are self-hosted under `public/fonts`.
- **Fluid scales.** Type and space steps come from Utopia (`scale.css`), so
  there are no breakpoints for sizing.
- **Light and dark** come from `light-dark()`. `ThemeSwitch.vue` can force one.
- The whole interface is right-to-left Arabic.

## Database workflow

- Change `server/db/schema.ts`, then `npm run db:generate` to create a migration.
- Locally, migrations are applied automatically on the next `npm run dev`.
- In production, pending migrations are applied automatically when the server
  starts (see `server/db/index.ts`). Pushing a new migration to `main` is enough.
- `npm run db:studio` opens a browser UI over the database.

## Production

The live site runs on one netcup server (VPS 500, Debian 13, Nuremberg), managed
with [Coolify](https://coolify.io), a self-hosted dashboard at
`https://coolify.lahga.fyi`. The domain is registered at Cloudflare, which also
serves its DNS.

- **Deploys.** Every push to `main` triggers a GitHub webhook. Coolify pulls the
  repository, builds the `Dockerfile` on the server, waits for `/api/health` to
  answer, then swaps the running container. A failed build leaves the old
  version running.
- **Database.** PostgreSQL 17 runs in its own container next to the app and is
  not reachable from the internet. The app gets its address through the
  `DATABASE_URL` variable, set in Coolify.
- **Backups.** Coolify dumps the database every night at 03:00, keeps the
  last 14 dumps under `/data/coolify/backups` on the server, and uploads each
  one to a Scaleway bucket in Paris. `scripts/restore-drill.sh` proves a dump
  restores; run it now and then.
- **Uptime.** A Cloudflare Worker in `ops/uptime/` checks the site every five
  minutes from outside and emails info@lahga.fyi when it goes down or comes back.
- **HTTPS.** Coolify's proxy (Traefik) obtains and renews Let's Encrypt
  certificates on its own. `http://` and `www.` redirect to `https://lahga.fyi`.
- **Server access.** SSH with a key only; password login is disabled. Security
  updates install automatically, fail2ban blocks repeated login attempts, and
  Coolify's setup ports are firewalled off (`/usr/local/sbin/lahga-firewall.sh`).

### Configuration

Secrets live in Coolify's environment variables, never in the repository. See
`.env.example` for the full list: database, session secret, Brevo (email),
Google login, Turnstile, contact form address.

## Rules

- The site and its content are Arabic script only. Content fields reject Latin
  letters; see `shared/utils/arabic.ts`.
- Nothing user-generated is edited in place. Corrections are new rows that
  compete on votes.

## Licence

Two licences, because the code and the content are different things.

**The code**, everything in this repository, is under the
[GNU Affero General Public License v3.0](LICENSE). Run it, change it, host it.
If you host a changed copy, publish your changes under the same licence and
give its users a way to the source, as the site's footer does for this one.
Copyright (C) 2026 Yasser Maslout-Siegfried.

**The content** (words, dialect forms, definitions, notes, examples, dialect
descriptions, and the seed files that are kept outside this repository) is published under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). That choice is
not free: part of the seed comes from Maknuune, which is BY-SA, and share-alike
material can only be passed on under the same licence. Contributors agree to it
on /terms, and ContributeGate says so next to every form.

**Neither licence covers** the name «لهجة» or the jeem-dot logo. The fonts in
`public/fonts/` (Amiri, IBM Plex Sans Arabic) keep their own SIL Open Font
License.

## Roadmap

The phases, with schema changes and endpoints, are in [docs/PLAN.md](docs/PLAN.md):
accounts, contribution with revision history, votes and flags, moderation and
proposals, seed content and launch, then audio, images, dialect suggestions,
phrases and reputation.
