# Seed content format

A JSON file with a list of words. Everything imported is attributed to the site
account «لهجة» and marked "استيراد" in the history.

Two ways in. At `/admin/import` (admins only), "تحقق" validates without saving
and "استيراد" saves. From the command line, with `IMPORT_TOKEN` set in `.env`
and in the server's environment:

```sh
npm run import -- docs/seed/words-*.json           # validates, saves nothing
npm run import -- docs/seed/words-05-food.json --commit
npm run import -- file.json --url https://lahga.fyi --commit
```

The script validates every chunk before saving it, never saves a chunk that has
errors, and splits files larger than 500 words. Running it twice is safe:
a headword that exists is merged and a form already present in that dialect
group is skipped.

```json
{
  "words": [
    {
      "headword": "سيارة",
      "definition": "مركبة ذات أربع عجلات تسير بمحرك",
      "kind": "word",
      "entries": [
        {
          "dialect": "cairene",
          "form": "عربية",
          "meaning": "السيارة",
          "notes": "الأكثر شيوعاً في مصر",
          "examples": [
            { "text": "ركبت العربية ورحت الشغل", "gloss": "ركبت السيارة وذهبت إلى العمل" }
          ]
        }
      ]
    }
  ]
}
```

Rules, all enforced by the importer:

- Every text field is Arabic script only. Latin letters are rejected.
- `kind` is `word` (default), `phrase` or `proverb`.
- `dialect` is a slug from the dialect tree (`/api/dialects`): top level
  `egyptian`, `levantine`, `gulf`, `najdi`, `hejazi`, `yemeni`, `iraqi`,
  `sudanese`, `maghrebi`, `hassaniya`; second level for example `cairene`,
  `saidi`, `syrian`, `lebanese`, `palestinian`, `jordanian`, `kuwaiti`,
  `emirati`, `baghdadi`, `moroccan`, `algerian`, `tunisian`, `libyan`.
  Use the top level when the word is common to the whole region.
- A word needs at least one entry. `meaning`, `notes`, `examples` and `gloss`
  are optional. The word's own `definition` carries the sense, so an entry only
  needs a `meaning` when the dialect word means something narrower or different.
- A headword that already exists is merged: new entries are added to it, an
  entry whose form already exists on that word anywhere in the same dialect
  group (for example Egyptian and Cairene) is skipped.
- At most 500 words per file.
