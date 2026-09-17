# لهجة — Lahga

قاموس اللهجات العربية بمشاركة المستخدمين. See `docs/PROJECT.md` for the product
description and `docs/DATA_MODEL.md` for the database design.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database setup is needed: without a
`DATABASE_URL` the server uses an embedded Postgres (PGlite) stored in
`.data/`, applies the migrations, and seeds the dialect tree plus a few sample
words on first start. Delete `.data/` to start fresh.

## Project layout

```
app/            Vue side (Nuxt 4)
  layouts/      header, nav, footer
  pages/        one file per route: /, /browse, /w/[id], /d/[slug], static pages
  components/   shared UI pieces
  assets/css/   global styles, RTL, colours, Tajawal font
shared/utils/   code used by both client and server (Arabic normalisation)
server/
  api/          HTTP endpoints, one file per route
  db/           Drizzle schema, connection, seed data
  plugins/      runs at startup (migrations + seed)
drizzle/        generated SQL migrations, committed
docs/           product and data-model docs
```

## Database workflow

- Change `server/db/schema.ts`, then `npm run db:generate` to create a migration.
- Locally, migrations are applied automatically on the next `npm run dev`.
- In production, pending migrations are applied automatically when the server
  starts (see `server/db/index.ts`). Pushing a new migration to `main` is enough.
- `npm run db:studio` opens a browser UI over the database.

## Production

The live site runs on one netcup server (VPS 500, Debian 13, Nuremberg), managed
with [Coolify](https://coolify.io), a self-hosted dashboard at
`https://coolify.lahga.fyi`.

- **Deploys.** Every push to `main` triggers a GitHub webhook. Coolify pulls the
  repository, builds the `Dockerfile` on the server, waits for `/api/health` to
  answer, then swaps the running container. A failed build leaves the old
  version running.
- **Database.** PostgreSQL 17 runs in its own container next to the app and is
  not reachable from the internet. The app gets its address through the
  `DATABASE_URL` variable, set in Coolify.
- **Backups.** Coolify dumps the database every night at 03:00 and keeps the
  last 14 dumps under `/data/coolify/backups` on the server.
- **HTTPS.** Coolify's proxy (Traefik) obtains and renews Let's Encrypt
  certificates on its own.
- **Server access.** SSH with a key only; password login is disabled. Security
  updates install automatically, fail2ban blocks repeated login attempts, and
  Coolify's setup ports are firewalled off (`/usr/local/sbin/lahga-firewall.sh`).
- **Static snapshot.** `.github/workflows/pages.yml` still publishes a read-only
  copy to GitHub Pages on every push, built from the seed data.

## Rules

- The site and its content are Arabic script only. Content fields reject Latin
  letters; see `shared/utils/arabic.ts`.
- Nothing user-generated is edited in place. Corrections are new rows that
  compete on votes.
