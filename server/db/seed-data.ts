/**
 * Seed content: the dialect tree and a handful of words with entries across
 * dialects, so the site has something to show from the first run.
 * Applied by server/plugins/seed.ts only when the dialects table is empty.
 */

export interface DialectSeed {
  slug: string
  nameAr: string
  descriptionAr?: string
  active?: boolean
  children?: DialectSeed[]
}

export const dialectTree: DialectSeed[] = [
  { slug: 'egyptian', nameAr: 'مصري', descriptionAr: 'اللهجة المصرية', children: [
    { slug: 'cairene', nameAr: 'قاهري' },
    { slug: 'saidi', nameAr: 'صعيدي' },
    { slug: 'alexandrian', nameAr: 'إسكندراني' },
  ] },
  { slug: 'levantine', nameAr: 'شامي', descriptionAr: 'اللهجات الشامية (سوريا، لبنان، فلسطين، الأردن)', children: [
    { slug: 'syrian', nameAr: 'سوري' },
    { slug: 'lebanese', nameAr: 'لبناني' },
    { slug: 'palestinian', nameAr: 'فلسطيني' },
    { slug: 'jordanian', nameAr: 'أردني' },
  ] },
  { slug: 'gulf', nameAr: 'خليجي', descriptionAr: 'لهجات الخليج العربي (الكويت، البحرين، قطر، الإمارات، عمان، شرق السعودية)', children: [
    { slug: 'kuwaiti', nameAr: 'كويتي' },
    { slug: 'bahraini', nameAr: 'بحريني' },
    { slug: 'qatari', nameAr: 'قطري' },
    { slug: 'emirati', nameAr: 'إماراتي' },
    { slug: 'omani', nameAr: 'عماني' },
    { slug: 'eastern-saudi', nameAr: 'شرق السعودية' },
  ] },
  { slug: 'najdi', nameAr: 'نجدي', descriptionAr: 'لهجة نجد (وسط السعودية)' },
  { slug: 'hejazi', nameAr: 'حجازي', descriptionAr: 'لهجة الحجاز (غرب السعودية)' },
  { slug: 'yemeni', nameAr: 'يمني', descriptionAr: 'اللهجات اليمنية', children: [
    { slug: 'sanaani', nameAr: 'صنعاني' },
    { slug: 'adeni', nameAr: 'عدني' },
    { slug: 'hadhrami', nameAr: 'حضرمي' },
  ] },
  { slug: 'iraqi', nameAr: 'عراقي', descriptionAr: 'اللهجات العراقية', children: [
    { slug: 'baghdadi', nameAr: 'بغدادي' },
    { slug: 'mosuli', nameAr: 'موصلي' },
    { slug: 'basrawi', nameAr: 'بصراوي' },
  ] },
  { slug: 'sudanese', nameAr: 'سوداني', descriptionAr: 'اللهجة السودانية' },
  { slug: 'maghrebi', nameAr: 'مغاربي', descriptionAr: 'اللهجات المغاربية (المغرب، الجزائر، تونس، ليبيا)', children: [
    { slug: 'moroccan', nameAr: 'مغربي' },
    { slug: 'algerian', nameAr: 'جزائري' },
    { slug: 'tunisian', nameAr: 'تونسي' },
    { slug: 'libyan', nameAr: 'ليبي' },
  ] },
  { slug: 'hassaniya', nameAr: 'حساني', descriptionAr: 'لهجة حسانية (موريتانيا، الصحراء، جنوب المغرب)' },
  { slug: 'andalusi', nameAr: 'أندلسي', descriptionAr: 'اللهجة الأندلسية التاريخية', active: false },
  { slug: 'siculo', nameAr: 'صقلي', descriptionAr: 'اللهجة العربية الصقلية التاريخية', active: false },
  { slug: 'maltese', nameAr: 'مالطي', descriptionAr: 'اللغة المالطية (متفرعة من العربية)', active: false },
]

export interface WordSeed {
  headword: string
  definition: string
  entries: { dialect: string, form: string, meaning: string, examples?: string[] }[]
}

export const sampleWords: WordSeed[] = [
  {
    headword: 'الآن',
    definition: 'في هذا الوقت، في اللحظة الحاضرة.',
    entries: [
      { dialect: 'egyptian', form: 'دلوقتي', meaning: 'الآن، في هذه اللحظة.', examples: ['أنا جاي دلوقتي.'] },
      { dialect: 'levantine', form: 'هلق', meaning: 'الآن.', examples: ['هلق بجي عندك.'] },
      { dialect: 'palestinian', form: 'هسا', meaning: 'الآن.', examples: ['هسا بروح.'] },
      { dialect: 'iraqi', form: 'هسة', meaning: 'الآن.', examples: ['هسة أجي.'] },
      { dialect: 'gulf', form: 'الحين', meaning: 'الآن.', examples: ['الحين بروح السوق.'] },
      { dialect: 'najdi', form: 'الحين', meaning: 'الآن.' },
      { dialect: 'moroccan', form: 'دابا', meaning: 'الآن.', examples: ['دابا نجي.'] },
      { dialect: 'tunisian', form: 'توا', meaning: 'الآن.', examples: ['توا نجي.'] },
      { dialect: 'sudanese', form: 'هسع', meaning: 'الآن.', examples: ['هسع بجي.'] },
      { dialect: 'yemeni', form: 'ذلحين', meaning: 'الآن.' },
    ],
  },
  {
    headword: 'جيد',
    definition: 'حسن، ذو صفة مقبولة أو ممتازة.',
    entries: [
      { dialect: 'egyptian', form: 'كويس', meaning: 'جيد، حسن.', examples: ['الأكل كويس أوي.'] },
      { dialect: 'levantine', form: 'منيح', meaning: 'جيد.', examples: ['الجو منيح اليوم.'] },
      { dialect: 'gulf', form: 'زين', meaning: 'جيد، حسن.', examples: ['الشغل زين.'] },
      { dialect: 'iraqi', form: 'زين', meaning: 'جيد.' },
      { dialect: 'moroccan', form: 'مزيان', meaning: 'جيد، جميل.', examples: ['هاد الشي مزيان بزاف.'] },
      { dialect: 'tunisian', form: 'باهي', meaning: 'جيد، حسن.', examples: ['الماكلة باهية برشا.'] },
      { dialect: 'sudanese', form: 'سمح', meaning: 'جيد، جميل.' },
    ],
  },
  {
    headword: 'ماذا',
    definition: 'أداة استفهام عن غير العاقل.',
    entries: [
      { dialect: 'egyptian', form: 'إيه', meaning: 'ماذا.', examples: ['عايز إيه؟'] },
      { dialect: 'levantine', form: 'شو', meaning: 'ماذا.', examples: ['شو بدك؟'] },
      { dialect: 'iraqi', form: 'شنو', meaning: 'ماذا.', examples: ['شنو تريد؟'] },
      { dialect: 'kuwaiti', form: 'شنو', meaning: 'ماذا.' },
      { dialect: 'najdi', form: 'وش', meaning: 'ماذا.', examples: ['وش تبي؟'] },
      { dialect: 'hejazi', form: 'إيش', meaning: 'ماذا.', examples: ['إيش تبغى؟'] },
      { dialect: 'moroccan', form: 'آش', meaning: 'ماذا.', examples: ['آش بغيتي؟'] },
      { dialect: 'sudanese', form: 'شنو', meaning: 'ماذا.', examples: ['داير شنو؟'] },
    ],
  },
  {
    headword: 'كثيرا',
    definition: 'بدرجة كبيرة، بكمية وافرة.',
    entries: [
      { dialect: 'egyptian', form: 'أوي', meaning: 'جدا، كثيرا.', examples: ['حلو أوي.'] },
      { dialect: 'levantine', form: 'كتير', meaning: 'كثيرا، جدا.', examples: ['حلو كتير.'] },
      { dialect: 'iraqi', form: 'هواية', meaning: 'كثيرا.', examples: ['أحبك هواية.'] },
      { dialect: 'gulf', form: 'واجد', meaning: 'كثيرا.', examples: ['زين واجد.'] },
      { dialect: 'moroccan', form: 'بزاف', meaning: 'كثيرا.', examples: ['غالي بزاف.'] },
      { dialect: 'tunisian', form: 'برشا', meaning: 'كثيرا.', examples: ['باهي برشا.'] },
      { dialect: 'sudanese', form: 'شديد', meaning: 'كثيرا، جدا.', examples: ['حلو شديد.'] },
    ],
  },
]
