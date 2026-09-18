import * as v from 'valibot'
import { and, eq } from 'drizzle-orm'
import { useDb, schema } from '../../db'
import { readBody$ } from '../../utils/validate'
import { isArabicOnly } from '../../../shared/utils/arabic'

/** A user proposes a new description for a dialect. One pending proposal per user per dialect. */
const Body = v.object({
  dialect: v.pipe(v.string('اللهجة مطلوبة'), v.regex(/^[a-z0-9-]{2,60}$/, 'اللهجة غير معروفة')),
  descriptionAr: v.pipe(
    v.string('الوصف مطلوب'), v.trim(), v.minLength(20, 'الوصف قصير جداً (20 حرفاً على الأقل)'), v.maxLength(3000, 'الوصف طويل جداً (3000 حرف كحد أقصى)'),
    v.check(isArabicOnly, 'الوصف يجب أن يكون بالحروف العربية'),
  ),
})

export default defineEventHandler(async (event) => {
  const user = await requireContributor(event)
  const body = await readBody$(event, Body)
  const db = await useDb()
  const dialect = await findDialect(db, body.dialect)
  const pending = await db.query.proposals.findFirst({ where: and(
    eq(schema.proposals.authorId, user.id), eq(schema.proposals.kind, 'dialect_description'), eq(schema.proposals.targetId, dialect.id), eq(schema.proposals.status, 'pending'),
  ) })
  if (pending) throw createError({ statusCode: 409, statusMessage: 'لديك اقتراح قيد المراجعة لهذه اللهجة بالفعل' })
  const [p] = await db.insert(schema.proposals).values({ kind: 'dialect_description', targetId: dialect.id, data: { descriptionAr: body.descriptionAr }, authorId: user.id }).returning()
  return { id: p!.id }
})
