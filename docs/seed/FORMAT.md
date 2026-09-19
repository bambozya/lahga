# Seed content format

A JSON file with a list of words. Import it at `/admin/import` (admins only).
"تحقق" validates without saving; "استيراد" saves. Everything imported is
attributed to the site account «لهجة» and marked "استيراد" in the history.

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
