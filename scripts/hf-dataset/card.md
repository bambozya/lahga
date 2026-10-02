---
pretty_name: "Lahga: a dictionary of Arabic dialects"
license: cc-by-sa-4.0
language:
{{languages}}
task_categories:
- translation
tags:
- arabic
- arabic-dialects
- dialectal-arabic
- lexicon
- dictionary
- msa
size_categories:
- {{size}}
configs:
- config_name: entries
  default: true
  data_files: entries.jsonl
- config_name: examples
  data_files: examples.jsonl
- config_name: dialects
  data_files: dialects.jsonl
---

# Lahga: a dictionary of Arabic dialects

<div dir="rtl" lang="ar">

**لهجة: معجم اللهجات العربية.** معجم تشاركي مفتوح، كل صفحة فيه تبدأ من معنى
بالعربية الفصحى، وتحته الأشكال التي يُقال بها في اللهجات، كل شكل منسوب إلى
لهجته. هذه نسخة من بيانات الموقع [lahga.fyi]({{site}}) بتاريخ {{date}}.

</div>

[Lahga]({{site}}) is an open, collaborative dictionary of spoken Arabic. Every
headword is a meaning stated in Modern Standard Arabic: a word, a short phrase
or a proverb. Under it are the forms the dialects use for that meaning, each
attributed to one variety. A form can carry a narrower meaning, usage notes,
and example sentences written in the dialect with a gloss in MSA.

One row of the default table answers one question: *how does this variety say
this?*

| | |
|---|---|
| Headwords (MSA) | {{words}} |
| Dialect forms | {{entries}} |
| Forms not yet confirmed by a speaker | {{unconfirmed}} ({{unconfirmed_share}}) |
| Example sentences | {{examples}} |
| Varieties with at least one form | {{dialects}} |
| Snapshot | {{date}} |
| Licence | CC BY-SA 4.0 |

Everything is in Arabic script. There is no English and no transliteration.

## Read this before you build on it

**More than half of the forms were first drafted by a language model**, from
the model's own knowledge of the dialects, and read by the maintainer before
import. The maintainer is one person, not a speaker of thirty-three varieties.

The forms those drafts were least sure of, and whole batches drafted for
Najdi, Libyan and Yemeni, carry `needs_review: true`. That is {{unconfirmed}}
of {{entries}}. On the site, the same forms show a mark and a yes/no question
that any reader can answer; a form loses the mark when speakers confirm it.

`needs_review: false` therefore means *not flagged*, not *verified by a native
speaker*. It covers forms taken from the published sources below, forms added
or corrected by contributors, and drafted forms the maintainer saw no reason to
doubt. The export does not yet say which of these a given row is.

If your use needs certainty, treat the whole file as a well-organised list of
candidates. If you find a wrong form, the fastest fix is the «لا» under it on
its page at lahga.fyi.

## Where the rest comes from

- **[Maknuune](https://sites.google.com/nyu.edu/palestine-lexicon)**, the open
  Palestinian Arabic lexicon of NYU Abu Dhabi (CC BY-SA 4.0): Palestinian forms
  and their examples.
- **[Wiktionary](https://en.wiktionary.org/)**, through the
  [kaikki.org](https://kaikki.org/dictionary/) extracts (CC BY-SA): Egyptian,
  Levantine, Hejazi, Gulf, Moroccan and Tunisian forms.
- **Peace Corps** Jordan language lessons (public domain): a few Jordanian
  forms.
- **Speakers**, through the site: additions, corrections and votes.

An imported source gives a variety at most two forms per headword, so that one
large lexicon does not drown the others.

## What the dictionary leaves out, on purpose

A meaning has a page only if dialects say it differently. A word that every
Arab says the same way is not in the dictionary. So this is not a general
lexicon of any one dialect, and a form's absence says nothing about whether
the variety has the word.

## Files

| File | Config | One row is |
|---|---|---|
| `entries.jsonl` | `entries` (default) | one dialect form under one headword |
| `examples.jsonl` | `examples` | one example sentence, with its MSA gloss |
| `dialects.jsonl` | `dialects` | one variety |
| `lahga.json` | | the site's own export, nested: words → entries → examples |

```python
from datasets import load_dataset

forms = load_dataset("{{repo}}", split="train")
confirmed = forms.filter(lambda row: not row["needs_review"])
egyptian = forms.filter(lambda row: row["dialect_group"] == "egyptian")

examples = load_dataset("{{repo}}", "examples", split="train")
```

### `entries`

| Field | |
|---|---|
| `headword` | the meaning, in Modern Standard Arabic |
| `kind` | `word`, `phrase` or `proverb` |
| `definition` | a short definition of the headword in MSA; may be null |
| `form` | how the variety says it |
| `dialect` | the variety's id, e.g. `egyptian`, `lebanese`, `najdi` |
| `dialect_name` | its name in Arabic |
| `dialect_group` | the group it belongs to (`lebanese` → `levantine`); a group's own forms name themselves |
| `language` | a BCP-47 tag: `arz`, `apc-LB`, `afb-KW`, `ary`, … |
| `meaning` | a narrower meaning, when the form's use differs from the headword's; mostly null |
| `notes` | usage notes in Arabic: who says it, when, its register; mostly null |
| `needs_review` | `true` if drafted by a language model and not yet confirmed by a speaker (see above) |
| `examples` | how many example sentences the form has |
| `entry_id`, `word_id` | the site's ids, stable across snapshots |
| `source` | the headword's page on lahga.fyi, the URL to cite |

A form filed under a group (`levantine`) is one the group shares; a form filed
under a variety (`lebanese`) is that variety's own. The same form can appear
under several headwords.

### `examples`

`text` is the sentence in the dialect, `gloss` its meaning in MSA (may be
null). The other fields repeat the form the sentence illustrates. Some
examples come from Maknuune and Wiktionary; the rest were written for the site.

### `dialects`

`slug`, `name`, `language`, `parent`, `description` (Arabic), `url`, and
`forms`, the number of forms filed under it.

## Coverage

Uneven, and the table says how. Groups are followed by their varieties.

{{coverage}}

## Spelling

Dialects have no standard spelling and none is imposed here: a form is written
the way its speakers usually write it, mostly without diacritics. The same word can therefore differ by a letter between
two varieties that pronounce it alike. No normalisation such as CODA has been
applied.

## Licence and attribution

[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Copy it and
build on it for any purpose, on two conditions: say where it came from, and
publish what you build on it under the same licence. That holds for a model
trained on it as well.

> لهجة: معجم اللهجات العربية، {{site}}، برخصة CC BY-SA 4.0.

For a single row, the URL in its `source` field is enough.

```bibtex
@misc{lahga,
  title        = {Lahga: a collaborative dictionary of Arabic dialects},
  author       = {{Lahga contributors}},
  year         = {{{year}}},
  howpublished = {\url{{{site}}}},
  note         = {Snapshot of {{date}}. CC BY-SA 4.0}
}
```

## Staying current

The dictionary changes daily and this is a snapshot. The current files are
always at [{{site}}/data]({{site}}/data), rebuilt within the hour of any
change. Corrections belong on the site, where they reach every later snapshot.
Contact: info@lahga.fyi.
