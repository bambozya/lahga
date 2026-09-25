import { eq, isNull } from 'drizzle-orm'
import { useDb, schema } from '../db'
import { entryCounts, MIN_ENTRIES } from '../api/dialects/index.get'

/**
 * /llms.txt (https://llmstxt.org): a short, plain-text map of the site for
 * the crawlers that feed language models and answer engines, in the shape
 * they have agreed to look for. What the site is, how to cite it, where the
 * open data is, and one line per dialect. Built from the database so the
 * dialect list is never out of date. Same caching as the sitemap.
 */
export default defineEventHandler(async (event) => {
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const db = await useDb()
  const [groups, subs, filled] = await Promise.all([
    db.query.dialects.findMany({ where: isNull(schema.dialects.parentId), orderBy: schema.dialects.sortOrder }),
    db.select({ id: schema.dialects.id, slug: schema.dialects.slug, nameAr: schema.dialects.nameAr, parentId: schema.dialects.parentId })
      .from(schema.dialects).where(eq(schema.dialects.active, 1)),
    entryCounts(db),
  ])
  const first = (t: string | null) => (t ?? '').split(/\n\s*\n/)[0]?.trim().replace(/\s+/g, ' ') ?? ''

  const lines = [
    '# لهجة (lahga.fyi)',
    '',
    '> معجم تشاركي للهجات العربية: كل صفحة تبدأ من معنى بالفصحى، وتحتها الأشكال التي يُقال بها في اللهجات، كل شكل منسوب إلى لهجته، مع ملاحظات وأمثلة. Lahga is a crowd-sourced dictionary of spoken Arabic dialects, pivoted on Modern Standard Arabic; every page answers "how is this said in each dialect?".',
    '',
    '- اللغة: العربية فقط. الروابط ثابتة: /w/<الكلمة> لصفحة كلمة، /d/<اللهجة> لصفحة لهجة، /d/<أ>/vs/<ب> لمقارنة لهجتين.',
    `- الرخصة: المحتوى كله برخصة CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). الاستشهاد: «لهجة، معجم اللهجات العربية» مع رابط الصفحة، مثلاً ${site}/w/…`,
    '- الصفحات تحمل بيانات منظمة (schema.org DefinedTerm / DefinedTermSet) ووسم لغة BCP-47 لكل شكل (arz، apc، afb، ary…).',
    '- المحتوى من أناس يتكلمون هذه اللهجات ومن مصادر مفتوحة مذكورة في صفحة «عن الموقع»؛ لا محتوى مكتوباً بالذكاء الاصطناعي.',
    '',
    '## البيانات المفتوحة',
    '',
    `- [المعجم كاملاً (JSON)](${site}/data/lahga.json): كل الكلمات وأشكالها وأمثلتها، مع رابط المصدر لكل كلمة.`,
    `- [الأشكال (CSV)](${site}/data/entries.csv): سطر لكل شكل في لهجته.`,
    `- [عن البيانات](${site}/data): الحقول، والرخصة، وكيفية النسبة.`,
    '',
    '## اللهجات',
    '',
    ...groups.map((g) => {
      const children = subs.filter(s => s.parentId === g.id && (filled.get(s.id) ?? 0) >= MIN_ENTRIES)
      const desc = first(g.descriptionAr)
      const kids = children.length ? ` تتفرع إلى: ${children.map(c => `[${c.nameAr}](${site}/d/${c.slug})`).join('، ')}.` : ''
      return `- [${g.nameAr}](${site}/d/${g.slug})${desc ? `: ${desc}` : ''}${kids}`
    }),
    '',
    '## صفحات أخرى',
    '',
    `- [الكلمات التي تختلف عليها اللهجات أكثر](${site}/divergent)`,
    `- [عن الموقع](${site}/about): الفكرة، والمصادر، والرخصة.`,
    `- [شروط الاستخدام](${site}/terms)`,
    `- [خريطة الموقع](${site}/sitemap.xml)`,
    '',
  ]
  setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return lines.join('\n')
})
