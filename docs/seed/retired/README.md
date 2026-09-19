# Retired seed words

Words that turned out not to earn a page. A word is worth a page only when the
dialects say it differently; الحمد لله is الحمد لله from Casablanca to Basra,
and a page for it teaches nobody anything.

- `one-form.json` — 127 words with a single form across every dialect.
- `two-form.json` — 170 words with exactly two, once the definite article and
  the usual ة/ه spelling drift are ignored: بصل / بصله, سكر / شكر, ملح / ملحه.
  Some of these were real splits (لبن / حليب, راس / دماغ); they are here in full,
  with their examples, so nothing is lost.

They are kept rather than thrown away: each file is a valid seed file, so

```sh
npm run import -- docs/seed/retired/two-form.json --url https://lahga.fyi --commit
```

brings the whole batch back if we decide the dictionary should carry it anyway.

They were retired from the live site with `/api/admin/prune`, which soft-deletes:
nothing left the database, and the words still exist there with status `deleted`.

Run `npm run check-variety -- docs/seed/words-*.json` before importing anything
new; it exits 1 on a word with two or fewer forms, so it can gate an import.
