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
- In production, set `DATABASE_URL` and run `npm run db:migrate` before
  `npm run build` (make it part of the deploy's build command).
- `npm run db:studio` opens a browser UI over the database.

## Rules

- The site and its content are Arabic script only. Content fields reject Latin
  letters; see `shared/utils/arabic.ts`.
- Nothing user-generated is edited in place. Corrections are new rows that
  compete on votes.
