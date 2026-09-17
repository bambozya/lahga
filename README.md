# لهجة — Lahga

قاموس اللهجات العربية بمشاركة المستخدمين.

A user-driven dictionary of Arabic dialects. Every dialect word is linked to a
Modern Standard Arabic headword, so the site can show how the same idea is said
across the Arab world.

- **Live site:** https://lahga.fyi
- **Product description:** [docs/PROJECT.md](docs/PROJECT.md)
- **Database design:** [docs/DATA_MODEL.md](docs/DATA_MODEL.md)

## Status

The site is live and read-only. Browsing, search, dialect pages and word pages
work against a real PostgreSQL database. Accounts are the next milestone: they
unlock adding words, voting and moderation. The tables for all of that already
exist in the schema; the write endpoints and the login do not yet.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database setup is needed: without a
`DATABASE_URL` the server uses an embedded Postgres (PGlite) stored in
`.data/`, applies the migrations, and seeds the dialect tree plus a few sample
words on first start. Delete `.data/` to start fresh.

Node 22 or newer. Production runs on Node 22 (see the `Dockerfile`).

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production server build into `.output/` |
| `npm run preview` | Run the production build locally |
| `npm run generate` | Static HTML export (used for the GitHub Pages snapshot) |
| `npm run db:generate` | Create a migration from schema changes |
| `npm run db:migrate` | Apply migrations to the database in `DATABASE_URL` |
| `npm run db:studio` | Browser UI over the database |

## Project layout

```
app/                Vue side (Nuxt 4)
  layouts/          header, nav, footer, construction notice for the snapshot
  pages/            one file per route: /, /browse, /dialects, /w/[id], /d/[slug], static pages
  components/       AppLogo, WordCard, EntryCard, VoteBox, ThemeSwitch
  assets/css/       main.css (the design), scale.css (fluid type and space), fonts.css
  error.vue         the error page
shared/utils/       code used by both client and server (Arabic normalisation)
server/
  api/              HTTP endpoints, one file per route; /api/health is the container health check
  db/               Drizzle schema, connection, migrations on startup, seed data
  plugins/          runs at startup (opens the database, which migrates and seeds)
drizzle/            generated SQL migrations, committed
public/             favicons, robots.txt, self-hosted fonts
docs/               product and data-model docs
Dockerfile          the production image
.github/workflows/  the GitHub Pages snapshot
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
- **Backups.** Coolify dumps the database every night at 03:00 and keeps the
  last 14 dumps under `/data/coolify/backups` on the server. There is no
  offsite copy yet.
- **HTTPS.** Coolify's proxy (Traefik) obtains and renews Let's Encrypt
  certificates on its own. `http://` and `www.` redirect to `https://lahga.fyi`.
- **Server access.** SSH with a key only; password login is disabled. Security
  updates install automatically, fail2ban blocks repeated login attempts, and
  Coolify's setup ports are firewalled off (`/usr/local/sbin/lahga-firewall.sh`).

### Static snapshot

`.github/workflows/pages.yml` also publishes a read-only copy to
https://bambozya.github.io/lahga on every push. It is built from the seed data
with `LAHGA_STATIC=1`, shows a construction notice, and exists only as a
fallback.

## Rules

- The site and its content are Arabic script only. Content fields reject Latin
  letters; see `shared/utils/arabic.ts`.
- Nothing user-generated is edited in place. Corrections are new rows that
  compete on votes.

## Roadmap

1. Accounts and login.
2. Contributions: adding words, entries, examples and links; voting.
3. Moderation: flags, a moderator queue, hiding and restoring content.
4. Abuse protection: rate limits and a challenge on sign-up and submit.
5. Faster search with a trigram index.
6. Offsite backups, error tracking, an Impressum page.
