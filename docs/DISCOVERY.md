# Discovery

How search engines and the answer engines built on language models find the
site, and what makes them name it when they answer "how do you say X in
Egyptian?". The technical part is small and done; the rest is content and
distribution, and this file says which is which.

## What the site does by itself

- **Open to every crawler**, the AI ones included (`server/routes/robots.txt.get.ts`).
  Only account and admin paths are closed. There is no WAF in front that
  could block a bot silently.
- **A sitemap built from the database** with `lastmod` on every word
  (`server/routes/sitemap.xml.get.ts`).
- **Structured data on every content page** (`app/composables/useSeo.ts`):
  `DefinedTerm` on a word, `DefinedTermSet` on a dialect, `WebSite` with a
  search action on the home page, `Dataset` on `/data`, and a
  `BreadcrumbList` from the breadcrumb component. Every block declares the
  CC BY-SA licence.
- **A BCP-47 tag per dialect** (`shared/utils/dialectTags.ts`): ISO 639-3 has
  a code for most spoken varieties (arz, apc, afb, ary, …). The word page
  puts it on each form's `lang` attribute and on each `alternateName` in the
  JSON-LD, and the export carries it in a `language` field, so a machine can
  tell dialects apart without reading their Arabic names.
- **`/llms.txt`** (`server/routes/llms.txt.get.ts`), the plain-text site map
  that model crawlers have agreed to look for: what the site is, how to cite
  it, where the data is, one line per dialect.
- **The open data** under `/data` (`server/utils/exportData.ts`):
  `lahga.json` is the whole dictionary, `entries.csv` one form per row.
  Active rows only, no accounts or votes, every word with its own URL as
  `source`. Built in memory once an hour or after any content change. This is
  a download, not the public API the roadmap rules out.
- **IndexNow** (`server/utils/indexnow.ts`): after content changes, the
  changed word and dialect pages are submitted to Bing and to every engine
  sharing the protocol, within a minute. The revisions table says what
  changed. Google does not take part; it reads the sitemap. Needs
  `NUXT_INDEXNOW_KEY` set in Coolify; with it unset, nothing is sent.

## What needs a person, once

1. **Bing Webmaster Tools** (bing.com/webmasters): add lahga.fyi, verify by
   the DNS or meta-tag method, submit `/sitemap.xml`. ChatGPT search and
   Copilot answer from Bing's index, so this is the one step that matters
   most for the AI tools. Once verified, IndexNow submissions show up under
   the same account.
2. **Google Search Console**: same, submit the sitemap, and check the
   "Enhancements" panel shows the DefinedTerm and Dataset markup without
   errors.
3. **Set the key**: `openssl rand -hex 16`, put it in Coolify as
   `NUXT_INDEXNOW_KEY`, redeploy, and confirm
   `https://lahga.fyi/indexnow/<key>.txt` answers with the key.
4. **Publish the dataset where models are trained from**: a Hugging Face
   dataset (`lahga/arabic-dialects` or similar) and a GitHub release, both
   pointing at `/data/lahga.json` as the canonical file. The dataset card
   states the CC BY-SA licence and the attribution string from the file's
   `meta.attribution`. A row that reaches a training set carrying the site's
   URL is the most durable way to get the name into a future model.
5. **References from places models already trust**: Arabic Wiktionary and
   Arabic Wikipedia dialect articles accept a reference when the site adds
   something a reader cannot get elsewhere. One careful reference beats
   ten reverted ones. Arabic-learner communities and dialect teachers link
   to tools they actually use; the divergence pages (`/divergent`, `/d/a/vs/b`)
   are the pages nobody else has.

## What actually decides it

None of the above makes a page rank above a forum thread. Being the only
page that answers "how is this said in each dialect" does, and that needs
the content. The search-miss log (`/admin/search-misses`) is the list of
questions the site is failing to answer, written by the people asking them;
that list, not this file, is the priority.
