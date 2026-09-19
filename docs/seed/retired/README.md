# Retired seed words

Words whose form turned out to be the same in every dialect — الحمد لله is
الحمد لله from Casablanca to Basra, and a page for it teaches nobody anything.
They are kept here rather than thrown away: the file is a valid seed file, so
`npm run import -- docs/seed/retired/one-form.json --commit` brings them all
back if we decide a dialect dictionary should carry them anyway.

They were retired from the live site with `/api/admin/prune`, which soft-deletes:
nothing left the database, and the words still exist with status `deleted`.

Run `npm run check-variety -- docs/seed/words-*.json` to see what else is close
to the line (words with two forms are still in the live files).
