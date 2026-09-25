/**
 * A BCP-47 language tag for each dialect, so a machine reading the site (the
 * JSON-LD, the `lang` attribute on a form, the data export) can tell one
 * variety from another without parsing an Arabic dialect name.
 *
 * ISO 639-3 has a code for most spoken Arabic varieties (arz Egyptian, apc
 * Levantine, afb Gulf, ary Moroccan, …) and every such code is a valid
 * primary subtag. A country subtag narrows it where the site's tree does
 * (apc-LB, afb-KW). Groups with no single code fall back to `ar` plus a
 * region: ar-015 is UN M.49 for Northern Africa, the Maghreb group. Anything
 * not listed is plain `ar`, which is still true.
 */
const TAGS: Record<string, string> = {
  // Egypt
  egyptian: 'arz', cairene: 'arz-EG', alexandrian: 'arz-EG', saidi: 'aec',
  // Levant
  levantine: 'apc', lebanese: 'apc-LB', syrian: 'apc-SY', jordanian: 'apc-JO', palestinian: 'apc-PS',
  // Iraq
  iraqi: 'acm', baghdadi: 'acm-IQ', basrawi: 'acm-IQ', mosuli: 'ayp',
  // Gulf and the peninsula
  'gulf': 'afb', kuwaiti: 'afb-KW', bahraini: 'afb-BH', qatari: 'afb-QA', emirati: 'afb-AE',
  'eastern-saudi': 'afb-SA', najdi: 'ars', hejazi: 'acw', omani: 'acx',
  // Yemen
  yemeni: 'ar-YE', sanaani: 'ayn', adeni: 'acq', hadhrami: 'ayh',
  // Sudan
  sudanese: 'apd',
  // Maghreb
  maghrebi: 'ar-015', moroccan: 'ary', algerian: 'arq', tunisian: 'aeb', libyan: 'ayl', hassaniya: 'mey',
  // Historical and offshoots
  andalusi: 'xaa', maltese: 'mt', siculo: 'sqr',
}

export function dialectTag(slug: string | undefined | null): string {
  return (slug && TAGS[slug]) || 'ar'
}
