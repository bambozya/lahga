/**
 * CAPHI, the CAMeL Arabic Phonetic Inventory (Habash et al., LREC 2018,
 * https://aclanthology.org/L18-1574/, Figure 2): how a dialect form is
 * pronounced, written in ASCII so it types on any keyboard. One symbol per
 * sound, a space between sounds, a doubled consonant for shadda and a doubled
 * vowel for length: دلوقتي is `d i l w a 2 t i`, حبّ is `7 a b b`.
 *
 * The inventory below is the paper's, complete. The site's pronunciation
 * field (entries.pronunciation) accepts nothing outside it, so a stray
 * Arabic letter, an IPA sign or a made-up digraph is refused at input and the
 * export stays machine-readable. The same table draws the symbol page
 * (app/pages/pronunciation.vue), so the rule and its explanation cannot drift.
 */

export interface CaphiSymbol {
  /** The CAPHI symbol, as typed. */
  symbol: string
  /** Its value in the International Phonetic Alphabet. */
  ipa: string
  /** The sound, said in Arabic: usually the letter that writes it. */
  sound: string
  /** A word from the paper's table that has the sound, in CODA* spelling. */
  example: string
  /** That word in CAPHI. */
  caphi: string
  /** Whose word the example is. */
  dialect: string
}

export interface CaphiGroup { title: string, symbols: CaphiSymbol[] }

/** The inventory, grouped the way the page shows it. Order within a group follows the paper. */
export const CAPHI_GROUPS: CaphiGroup[] = [
  {
    title: 'الصوامت',
    symbols: [
      { symbol: 'b', ipa: 'b', sound: 'ب', example: 'باب', caphi: 'b ee b', dialect: 'صفاقس' },
      { symbol: 'p', ipa: 'p', sound: 'پ، باء مهموسة', example: 'پري', caphi: 'p r i', dialect: 'الجزائر' },
      { symbol: 'f', ipa: 'f', sound: 'ف', example: 'فردي', caphi: 'f a r d i', dialect: 'طرابلس' },
      { symbol: 'v', ipa: 'v', sound: 'ڤ', example: 'روندڤو', caphi: 'r oo n d ii v uu', dialect: 'الجزائر' },
      { symbol: 't', ipa: 't', sound: 'ت', example: 'تفاح', caphi: 't i f f ee 7', dialect: 'بيروت' },
      { symbol: 'd', ipa: 'd', sound: 'د', example: 'جديد', caphi: 'j d ii d', dialect: 'الجزائر' },
      { symbol: 'th', ipa: 'θ', sound: 'ث', example: 'ثياب', caphi: 'th y aa b', dialect: 'السلط' },
      { symbol: 'dh', ipa: 'ð', sound: 'ذ', example: 'ذراع', caphi: 'dh r aa 3', dialect: 'مسقط' },
      { symbol: 's', ipa: 's', sound: 'س', example: 'أساسي', caphi: '2 a s aa s i', dialect: 'الرباط' },
      { symbol: 'z', ipa: 'z', sound: 'ز', example: 'زورق', caphi: 'z a w r a 2', dialect: 'حلب' },
      { symbol: 'sh', ipa: 'ʃ', sound: 'ش', example: 'شاذر', caphi: 'sh aa dh i r', dialect: 'مسقط' },
      { symbol: 'j', ipa: 'ʒ', sound: 'ج الشامية، بلا تاء', example: 'جاب', caphi: 'j ee b', dialect: 'بيروت' },
      { symbol: 'dj', ipa: 'dʒ', sound: 'ج الفصحى', example: 'موجود', caphi: 'm a w dj uu d', dialect: 'الخرطوم' },
      { symbol: 'g', ipa: 'ɡ', sound: 'ج المصرية وقاف البدو، گ', example: 'قال', caphi: 'g aa l', dialect: 'أسوان' },
      { symbol: 'gy', ipa: 'ɡʲ', sound: 'g ممالة إلى الياء', example: 'جايز', caphi: 'gy aa y i z', dialect: 'الخرطوم' },
      { symbol: 'k', ipa: 'k', sound: 'ك', example: 'فاكهة', caphi: 'f aa k h a', dialect: 'الدوحة' },
      { symbol: 'q', ipa: 'q', sound: 'ق', example: 'قطار', caphi: 'q i t. aa r', dialect: 'فاس' },
      { symbol: 'qh', ipa: 'ɢ', sound: 'ق مجهورة من أقصى الحلق', example: 'رقم', caphi: 'r a qh a m', dialect: 'الخرطوم' },
      { symbol: '2', ipa: 'ʔ', sound: 'ء، ومنها قاف القاهرة ودمشق', example: 'طريق', caphi: 't. a r ii 2', dialect: 'دمشق' },
      { symbol: 'kh', ipa: 'x', sound: 'خ', example: 'تخت', caphi: 't a kh i t', dialect: 'حلب' },
      { symbol: 'gh', ipa: 'ɣ', sound: 'غ', example: 'غاوي', caphi: 'gh aa w i', dialect: 'مسقط' },
      { symbol: '7', ipa: 'ħ', sound: 'ح', example: 'حبّ', caphi: '7 a b b', dialect: 'صفاقس' },
      { symbol: '3', ipa: 'ʕ', sound: 'ع', example: 'عمّر', caphi: '3 a m m a r', dialect: 'الرباط' },
      { symbol: 'h', ipa: 'h', sound: 'ه', example: 'مهم', caphi: 'm u h i m m', dialect: 'أسوان' },
      { symbol: 'm', ipa: 'm', sound: 'م', example: 'مكّن', caphi: 'm a k k a n', dialect: 'صنعاء' },
      { symbol: 'n', ipa: 'n', sound: 'ن', example: 'فنّ', caphi: 'f a n n', dialect: 'بغداد' },
      { symbol: 'r', ipa: 'r', sound: 'ر', example: 'روج', caphi: 'r uu j', dialect: 'تونس' },
      { symbol: 'l', ipa: 'l', sound: 'ل', example: 'لازم', caphi: 'l aa z i m', dialect: 'الرياض' },
      { symbol: 'w', ipa: 'w', sound: 'و', example: 'ولد', caphi: 'w a l d', dialect: 'صنعاء' },
      { symbol: 'y', ipa: 'j', sound: 'ي', example: 'هايل', caphi: 'h aa y i l', dialect: 'الإسكندرية' },
      { symbol: 'ts', ipa: 'ts', sound: 'تس، كاف البدو', example: 'سمك', caphi: 's i m a ts', dialect: 'الرياض، بدوية' },
      { symbol: 'dz', ipa: 'dz', sound: 'دز', example: 'جزاير', caphi: 'dz aa y i r', dialect: 'الجزائر' },
      { symbol: 'tsh', ipa: 'tʃ', sound: 'چ، تش', example: 'چاف', caphi: 'tsh aa f', dialect: 'الدوحة' },
    ],
  },
  {
    title: 'المفخّمة',
    symbols: [
      { symbol: 't.', ipa: 'tˤ', sound: 'ط', example: 'طبق', caphi: 't. a b a g', dialect: 'الرياض' },
      { symbol: 'd.', ipa: 'dˤ', sound: 'ض', example: 'ضرس', caphi: 'd. i r s', dialect: 'جدة' },
      { symbol: 'dh.', ipa: 'ðˤ', sound: 'ظ', example: 'ظاهر', caphi: 'dh. aa h i r', dialect: 'أبوظبي' },
      { symbol: 's.', ipa: 'sˤ', sound: 'ص', example: 'قصّة', caphi: 'q i s. s. a', dialect: 'الإسكندرية' },
      { symbol: 'z.', ipa: 'zˤ', sound: 'ظ المنطوقة زاياً', example: 'عظيم', caphi: '3 a z. ii m', dialect: 'دمشق' },
      { symbol: 'b.', ipa: 'bˤ', sound: 'ب مفخّمة', example: 'ياباني', caphi: 'y aa b. aa n i', dialect: 'مسقط' },
      { symbol: 'p.', ipa: 'pˤ', sound: 'پ مفخّمة', example: 'پمپ', caphi: 'p. a m. p.', dialect: 'بغداد' },
      { symbol: 'f.', ipa: 'fˤ', sound: 'ف مفخّمة', example: 'فكّ', caphi: 'f. a k k', dialect: 'بغداد' },
      { symbol: 'm.', ipa: 'mˤ', sound: 'م مفخّمة', example: 'ميّ', caphi: 'm. a y y', dialect: 'دمشق' },
      { symbol: 'n.', ipa: 'nˤ', sound: 'ن مفخّمة', example: 'ناي', caphi: 'n. aa y', dialect: 'دمشق' },
      { symbol: 'r.', ipa: 'rˤ', sound: 'ر مفخّمة', example: 'فرنسي', caphi: 'f a r. a n s i', dialect: 'الخرطوم' },
      { symbol: 'l.', ipa: 'lˤ', sound: 'ل مفخّمة', example: 'لطش', caphi: 'l. a t. a sh', dialect: 'الخرطوم' },
    ],
  },
  {
    title: 'الحركات',
    symbols: [
      { symbol: 'a', ipa: 'a', sound: 'فتحة', example: 'سما', caphi: 's a m a', dialect: 'القاهرة' },
      { symbol: 'aa', ipa: 'aː', sound: 'ألف المد', example: 'دار', caphi: 'd aa r', dialect: 'أبوظبي' },
      { symbol: 'i', ipa: 'i', sound: 'كسرة', example: 'مرشِد', caphi: 'm u r sh i d', dialect: 'الموصل' },
      { symbol: 'ii', ipa: 'iː', sound: 'ياء المد', example: 'مزيكة', caphi: 'm a z z ii k a', dialect: 'الإسكندرية' },
      { symbol: 'u', ipa: 'u', sound: 'ضمة', example: 'جُبن', caphi: 'dj u b i n', dialect: 'الدوحة' },
      { symbol: 'uu', ipa: 'uː', sound: 'واو المد', example: 'بلوزة', caphi: 'b l uu z a', dialect: 'جدة' },
      { symbol: 'e', ipa: 'e', sound: 'كسرة ممالة إلى الفتح، قصيرة', example: 'باكر', caphi: 'b aa k e r', dialect: 'مسقط' },
      { symbol: 'ee', ipa: 'eː', sound: 'إمالة طويلة، ياء «بيت» الخليجية', example: 'حاسب', caphi: '7 ee s a b', dialect: 'بيروت' },
      { symbol: 'o', ipa: 'o', sound: 'ضمة ممالة إلى الفتح، قصيرة', example: 'قُلت', caphi: '2 o l t', dialect: 'القاهرة' },
      { symbol: 'oo', ipa: 'oː', sound: 'واو ممالة، طويلة', example: 'دور', caphi: 'd oo r', dialect: 'دمشق' },
    ],
  },
]

/** Optional boundary markers the paper allows between sounds: a morpheme (+) and a word (#). */
export const CAPHI_MARKERS = ['+', '#']

const SYMBOLS = new Set([...CAPHI_GROUPS.flatMap(g => g.symbols.map(s => s.symbol)), ...CAPHI_MARKERS])

/** The notation as it is stored: lower case, one space between sounds, nothing around. */
export function normalizeCaphi(input: string): string {
  return input.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Whether every space-separated token is a CAPHI symbol. Empty is fine: the
 * field is optional. A run with no space («dilwa2ti») is one unknown token,
 * so it is refused too, which is what tells a contributor about the spaces.
 */
export function isCaphi(input: string): boolean {
  const s = normalizeCaphi(input)
  return s === '' || s.split(' ').every(t => SYMBOLS.has(t))
}

/** The symbols a contributor wrote that are not in the inventory, for the error message. */
export function unknownCaphi(input: string): string[] {
  return [...new Set(normalizeCaphi(input).split(' ').filter(t => t && !SYMBOLS.has(t)))]
}
