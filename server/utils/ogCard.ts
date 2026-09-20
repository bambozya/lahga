import { Resvg } from '@resvg/resvg-js'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'

/**
 * Share cards (docs/REACH.md, Phase R2). Hand-written SVG, not satori: satori
 * shapes Arabic badly (letters come out disconnected), while resvg's own text
 * layout goes through rustybuzz and joins correctly. The cost is writing the
 * layout by hand instead of in JSX, which for one fixed template is no real
 * cost.
 *
 * Portrait, 4:5, at Instagram's own feed-post maximum (1080×1350): these are
 * not just link-preview thumbnails, they are meant to be saved and posted as
 * images in their own right, and a landscape 1200×630 card is exactly what
 * Instagram crops hardest. The trade is a squarer, more heavily cropped
 * thumbnail in a WhatsApp or Twitter link preview, which is the accepted cost.
 *
 * Colours and fonts are the tokens from app/assets/css/main.css, hard-coded:
 * a card has no CSS cascade to read them from, and it never switches with the
 * visitor's colour scheme (a chat preview is always read on its own, not next
 * to the site), so it is fixed to the light palette, which is also what most
 * chat apps render social-card previews on top of.
 */

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350

const PAPER = '#f6f3ec'
const INK = '#16140f'
const MUTED = '#5c574c'
const HAIR = '#d5cfc0'
const ACCENT = '#b8321a'

const PAD = 52

// Fonts are ttf copies of the same families the site uses for headwords and
// body text (app/assets/css/fonts.css), decompressed from the woff2 under
// public/fonts since resvg's font database reads ttf/otf, not woff2. Read
// through nitro's server-asset storage rather than straight off disk: a plain
// fs path under server/ is not an import, so nitro's build tracer would leave
// the files out of .output entirely. Nitro auto-mounts the whole
// server/assets/ directory under storage key "server" (no config needed,
// see nuxt.config.ts) — so a file at server/assets/fonts/x.ttf is read back
// as "server:fonts:x.ttf".
//
// Noto Naskh ships as a VARIABLE font (wght 400–700) and resvg does not apply
// variation axes — it reads the static OS/2 weight, which is 400, so every
// font-weight="700" here rendered as regular and nothing on the card was
// actually bold (the site looks right because a browser does apply the axis).
// The two files below are static instances cut from that variable font at
// wght 400 and 700 with fontTools, which resvg matches by weight properly.
const FONT_FILES = [
  'server:fonts:noto-naskh-arabic-400.ttf', // headwords and dialect forms, regular
  'server:fonts:noto-naskh-arabic-700.ttf', // …and the bold face they are actually set in
  'server:fonts:ibm-plex-sans-arabic-400.ttf', // labels, definitions, the domain
  'server:fonts:ibm-plex-sans-arabic-400-latin.ttf', // the Arabic-subset file above has no Latin glyphs at all — "lahga.fyi" and a trailing Arabic full stop both need this one
  'server:fonts:ibm-plex-sans-arabic-600.ttf', // dialect group names
]

const NASKH = 'Noto Naskh Arabic'
const SANS = 'IBM Plex Sans Arabic'

let fontPaths: string[] | null = null
/**
 * resvg's `fontFiles` option wants real file paths, not buffers, and nitro's
 * server-asset storage only gives back bytes — so the bytes are written to a
 * temp file once per process (on the first render) and the path reused after
 * that. Slower on the very first request, free on every one after.
 */
async function fonts(): Promise<string[]> {
  if (fontPaths) return fontPaths
  const storage = useStorage('assets')
  const paths = await Promise.all(FONT_FILES.map(async f => {
    const raw = await storage.getItemRaw(f)
    if (!raw) throw new Error(`og card font missing from server assets: ${f}`)
    const path = join(tmpdir(), `lahga-og-${f.replace(/:/g, '-')}`)
    await writeFile(path, Buffer.from(raw))
    return path
  }))
  return fontPaths = paths
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Trailing Common-script characters (Latin punctuation, an ellipsis) glued
// onto RTL Arabic text: resvg/rustybuzz mis-places them as a stray glyph near
// the START of the line instead of the end, regardless of font coverage
// (found by rendering real seed data and bisecting word by word). Stripped
// wherever text ends up next to Arabic on a card; never appended either, which
// is why clamp() below does not add its own "…" the way the app's clampText
// does — a card cut at a word boundary reads fine without one.
const TRAILING_COMMON_SCRIPT = /[.!?…"'\-,;:،؛]+$/

/** Trims to a whole word near the limit; a card that cuts off mid-word looks broken at thumbnail size. */
function clamp(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim().replace(TRAILING_COMMON_SCRIPT, '')
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd().replace(TRAILING_COMMON_SCRIPT, '')
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
/** Western digits glued onto RTL Arabic text hit the same resvg mis-placement bug as trailing Latin punctuation (see above) — Arabic-Indic digits are in the Arabic script block and shape correctly in the same run. */
function arabicDigits(n: number) {
  return String(n).replace(/[0-9]/g, d => ARABIC_DIGITS[+d]!)
}

// ---------- measuring text ----------
// resvg gives no text metrics API, but it will report the bounding box of a
// parsed SVG — so a word's real width is had by parsing a throwaway SVG that
// contains only that word and reading innerBBox(). That beats estimating from
// a per-character average, which was off by as much as 58% on a single word
// (عراقي estimated 269 against a real 170 at size 100): every such miss shows
// up on the card as a comma drifting away from the word it belongs to, or, in
// the other direction, as the next word painted on top of it.
//
// Measured once per word at REF_SIZE and scaled — glyph advances are linear in
// font size — so trying several candidate sizes costs nothing, and the cache
// survives across requests, which matters because dialect names repeat on
// nearly every card.
const REF_SIZE = 100
const widthCache = new Map<string, number>()

async function measureWidth(text: string, family: string, weight: string): Promise<number> {
  const key = `${family}|${weight}|${text}`
  const hit = widthCache.get(key)
  if (hit !== undefined) return hit
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="400"><text x="3000" y="250" text-anchor="end" font-family="${family}" font-weight="${weight}" font-size="${REF_SIZE}">${esc(text)}</text></svg>`
  let width: number
  try {
    const bbox = new Resvg(probe, { font: { fontFiles: await fonts(), loadSystemFonts: false, defaultFontFamily: SANS } }).innerBBox()
    width = bbox ? bbox.width : text.length * REF_SIZE * 0.5
  } catch {
    width = text.length * REF_SIZE * 0.5 // never let a measurement failure take the card down
  }
  widthCache.set(key, width)
  return width
}

// ---------- the "تُقال" paragraph ----------
// Every dialect form as one flowing sentence — "تُقال: كتير شامي، هواية
// عراقي، …" — rather than a grid, so the card is a sentence to read, not a
// table to scan. Two things are hand-rolled here: resvg does not wrap plain
// SVG text, so lines are broken by hand; and mixed-style text within one
// <text> element via <tspan> renders nothing at all in this resvg version
// (confirmed by rendering and reading the actual PNG back, twice, before
// giving up on it), so every word is its own positioned <text> element,
// placed by hand right to left.
//
// One word per element also means punctuation has to be placed by hand rather
// than left inside the string: resvg has no working `direction` property (rtl
// and unset measure identically), so a trailing neutral character like the
// colon in "تُقال:" is laid out against an LTR base and lands on the wrong
// side of the word. Emitting it as its own element, glued to the left of the
// word, puts it where Arabic actually wants it — and keeps it out of the
// trailing-punctuation bug documented on TRAILING_COMMON_SCRIPT above.

// The paragraph is set as large as it can be while still fitting the four
// lines the reference design allows for it: the first size that wraps to four
// lines or fewer wins, and if even the smallest does not fit, the overflow is
// dropped rather than allowed to run into the rule below it.
const PARA_SIZES = [48, 43, 38, 34]
const PARA_MAX_LINES = 4
const PARA_LINE_RATIO = 2.45 // line height as a multiple of font size; Arabic with diacritics needs the room, and the reference design measures the same
const SPACE_RATIO = 0.3 // the gap between words, as a multiple of font size
const GLUE_RATIO = 0.04 // the hair of space between a word and the comma or colon that hangs off it

interface ParaToken { text: string, family: string, weight: string, fill: string, width: number }
/** One or more tokens that must stay on the same line and render with no gap between them (a word and the comma glued to it). */
type ParaCluster = ParaToken[]

function clusterWidth(c: ParaCluster) {
  return c.reduce((sum, t) => sum + t.width, 0)
}

/**
 * Builds the clusters for the "تُقال" line: the label, then each dialect form
 * once (bold, ink) followed by every dialect that says it that way (muted),
 * each with its own comma glued on except the very last word in the whole
 * paragraph — entries already sorted and adjacent by group (see
 * server/routes/og/w/[id].png.get.ts) collapse into one form mention:
 * "أوي مصري، قاهري" instead of repeating "أوي" for each. Widths are at
 * REF_SIZE and scaled per candidate size by the caller.
 */
async function paragraphClusters(entries: CardForm[]): Promise<ParaCluster[]> {
  const token = async (text: string, family: string, weight: string, fill: string): Promise<ParaToken> =>
    ({ text, family, weight, fill, width: await measureWidth(text, family, weight) })

  // "تُقال" and its colon are two elements: see the note above on resvg's
  // missing `direction` support putting a trailing colon on the wrong side.
  const clusters: ParaCluster[] = [[
    await token('تُقال', SANS, '400', INK),
    await token(':', SANS, '400', INK),
  ]]

  const groups: { form: string, dialects: string[] }[] = []
  for (const e of entries) {
    const last = groups[groups.length - 1]
    if (last && last.form === e.form) last.dialects.push(e.dialectName)
    else groups.push({ form: e.form, dialects: [e.dialectName] })
  }
  for (const [gi, g] of groups.entries()) {
    clusters.push([await token(clamp(g.form, 16), NASKH, '700', INK)])
    for (const [di, d] of g.dialects.entries()) {
      const isLast = gi === groups.length - 1 && di === g.dialects.length - 1
      const name = await token(d, SANS, '400', MUTED)
      clusters.push(isLast ? [name] : [name, await token('،', SANS, '400', MUTED)])
    }
  }
  return clusters
}

/** Greedy wrap: packs clusters onto a line (with a space between them) until the next one would overflow, same idea as clamp() but for a multi-line, multi-style run instead of one string. */
function wrapClusters(clusters: ParaCluster[], maxWidth: number, scale: number, size: number): ParaCluster[][] {
  const spaceWidth = size * SPACE_RATIO
  const glue = size * GLUE_RATIO
  const lines: ParaCluster[][] = []
  let line: ParaCluster[] = []
  let width = 0
  for (const c of clusters) {
    const w = clusterWidth(c) * scale + glue * (c.length - 1)
    const added = (line.length ? spaceWidth : 0) + w
    if (line.length && width + added > maxWidth) {
      lines.push(line)
      line = [c]
      width = w
    } else {
      line.push(c)
      width += added
    }
  }
  if (line.length) lines.push(line)
  return lines
}

/**
 * Renders the paragraph, one <text> per word placed right to left by hand,
 * vertically centred in the band between the two rules so a two-line dialect
 * line and a four-line one both sit balanced. Picks the largest size from
 * PARA_SIZES that still wraps inside PARA_MAX_LINES; if even the smallest
 * overflows, the extra lines are dropped, since the rule and footer below are
 * anchored to the bottom of the card and must not be written over.
 */
async function paragraphSvg(entries: CardForm[], bandTop: number, bandBottom: number, right: number, maxWidth: number) {
  if (!entries.length) return ''
  const clusters = await paragraphClusters(entries)
  let size = PARA_SIZES[PARA_SIZES.length - 1]!
  let lines: ParaCluster[][] = []
  for (const candidate of PARA_SIZES) {
    lines = wrapClusters(clusters, maxWidth, candidate / REF_SIZE, candidate)
    size = candidate
    if (lines.length <= PARA_MAX_LINES) break
  }
  lines = lines.slice(0, PARA_MAX_LINES)

  const scale = size / REF_SIZE
  const spaceWidth = size * SPACE_RATIO
  const glue = size * GLUE_RATIO
  const lineHeight = size * PARA_LINE_RATIO
  let y = (bandTop + bandBottom) / 2 - ((lines.length - 1) * lineHeight) / 2 + size * 0.18
  let svg = ''
  for (const line of lines) {
    let cursor = right
    line.forEach((cluster, ci) => {
      if (ci > 0) cursor -= spaceWidth
      cluster.forEach((token, ti) => {
        if (ti > 0) cursor -= glue
        svg += `<text x="${cursor}" y="${y}" text-anchor="end" font-family="${token.family}" font-weight="${token.weight}" font-size="${size}" fill="${token.fill}">${esc(token.text)}</text>`
        cursor -= token.width * scale
      })
    })
    y += lineHeight
  }
  return svg
}

// The wordmark (see app/components/AppLogo.vue): لهجة set in Amiri Bold and
// outlined, plus the jeem's dot in the brand colour — the same two paths, not
// redrawn. Native size 1356×952; logoMark() scales and positions it by height.
const LOGO_VIEWBOX = { w: 1356, h: 952 }
const LOGO_INK_PATH = 'M265 269Q288 239 293 296L322 536Q333 629 385 628Q409 628 418 650Q427 674 416 711Q405 748 385 748Q323 748 297 716Q272 685 261 607Q223 664 208 671Q194 678 157 675Q109 672 75 650Q53 636 56 607Q59 578 78 543Q88 525 96 512Q104 499 110 492Q158 441 231 400Q223 321 235 306L265 269ZM240 472Q164 496 136 536Q132 542 139 546Q189 567 251 550Q249 534 246 514.5Q243 495 240 472ZM175 111Q181 103 192 106Q212 113 231 124Q250 135 266 149Q274 157 269 167L221 243Q213 254 203 245Q199 241 185.5 232.5Q172 224 150 211L117 265Q110 275 99 267Q94 263 75.5 252Q57 241 26 222Q15 216 23 205L71 133Q77 125 88 128Q118 138 144 157L175 111ZM377 632Q382 607 394.5 579.5Q407 552 426 521Q495 408 568 435Q735 496 807 499Q812 499 825 499.5Q838 500 860 500Q907 500 909 501Q929 507 922 532L901 595Q894 614 868 613Q811 610 773 618Q775 621 779 623Q825 641 918 628Q971 622 949 713Q941 745 922 748Q737 772 714 703Q710 689 708.5 672.5Q707 656 710 637Q688 647 632 673Q604 686 580 696Q556 706 536 714Q494 730 456 739Q418 748 385 748H376Q353 689 377 632ZM609 571Q466 518 412 625Q497 620 609 571ZM958 620Q955 587 966 543Q977 500 1031 440Q1086 379 1123 369Q1164 358 1182 430Q1183 434 1188 437Q1285 484 1319 521Q1332 535 1335 566Q1338 597 1328 635Q1323 654 1313.5 670Q1304 686 1292 698Q1267 723 1180 719Q1093 714 1033 698Q1008 714 980 726.5Q952 739 923 747Q897 753 888 720Q867 651 900 633Q904 631 910.5 630Q917 629 925 628Q940 627 958 620ZM1057 589Q1098 572 1105 560Q1113 547 1104 517Q1095 488 1085 488Q1075 488 1051 509Q1026 531 1010 561Q1017 579 1057 589ZM1168 543Q1164 559 1157.5 575Q1151 591 1141 605Q1165 608 1186 609Q1207 610 1224 610Q1241 610 1250 609.5Q1259 609 1260 609Q1247 594 1224 577Q1201 560 1168 543ZM1099 389Q1093 316 1090 269.5Q1087 223 1085 201Q1084 179 1082 161Q1080 143 1078 128Q1076 113 1075.5 102.5Q1075 92 1076 86Q1078 73 1106 30Q1117 16 1130 22Q1144 28 1147 40Q1153 82 1181 114Q1195 133 1180 152L1154 179Q1152 181 1152 181Q1168 427 1188 437Q1236 457 1227 502Q1219 534 1191 540Q1160 546 1138 524Q1108 492 1099 389Z'
const LOGO_DOT_PATH = 'M641 795Q647 787 658 790Q678 797 696.5 808Q715 819 731 833Q739 841 734 851L686 927Q679 937 668 929Q658 921 596 884Q585 877 592 867L641 795Z'

/** The wordmark at a given height, right-anchored at x. Returns its rendered width too, so callers can lay out whatever sits beside it (RTL: to its left). */
function logoMark(rightX: number, y: number, height: number) {
  const scale = height / LOGO_VIEWBOX.h
  const width = LOGO_VIEWBOX.w * scale
  const svg = `<g transform="translate(${rightX - width} ${y}) scale(${scale})">
    <path fill="${INK}" d="${LOGO_INK_PATH}"/>
    <path fill="${ACCENT}" d="${LOGO_DOT_PATH}"/>
  </g>`
  return { svg, width }
}

// The vertical rhythm, and the two rules, are measured off the reference
// design (its bands read back pixel by pixel and scaled to this canvas)
// rather than eyeballed. Both rules are the site's own: a hairline in --hair
// above the dialect line, the heavy 3px --rule in --ink above the footer, the
// same pair app/assets/css/main.css uses. Everything below RULE2_Y is
// anchored to the bottom of the card, so every card in the set carries its
// footer in exactly the same place whatever its content does.
const CONTENT_RIGHT = CARD_WIDTH - PAD
const CONTENT_WIDTH = CARD_WIDTH - PAD * 2
const LABEL_Y = 114
const HEADWORD_Y = 286
const DEFINITION_Y = 432
const RULE1_Y = 514
const PARA_TOP = 638
const RULE2_Y = 1078
const FOOTER_BASELINE = 1236
const LOGO_TOP = 1136
const LOGO_HEIGHT = 152

/**
 * The footer every card shares: lahga.fyi in the brand colour and bold — the
 * loudest thing down here, since it is the one piece of the card that still
 * identifies the site once it is a bare image in a chat thread — and the
 * wordmark with the site's own tagline, quieter, opposite it. No underline:
 * the colour and weight already carry it.
 */
function frame(body: string) {
  const logo = logoMark(CONTENT_RIGHT, LOGO_TOP, LOGO_HEIGHT)
  const tagline = 'قاموس اللهجات العربية'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${PAPER}"/>
    ${body}
    <line x1="${PAD}" y1="${RULE2_Y}" x2="${CONTENT_RIGHT}" y2="${RULE2_Y}" stroke="${INK}" stroke-width="8"/>
    <text x="${PAD}" y="${FOOTER_BASELINE}" font-family="${SANS}" font-weight="700" font-size="64" fill="${ACCENT}">lahga.fyi</text>
    <text x="${CONTENT_RIGHT - logo.width - 28}" y="${FOOTER_BASELINE}" text-anchor="end" font-family="${SANS}" font-size="26" fill="${MUTED}">${tagline}</text>
    ${logo.svg}
  </svg>`
}

interface CardForm { form: string, dialectName: string }

/**
 * Picks the largest size from `sizes` at which `text` fits `maxWidth`, by
 * measurement rather than by counting characters: a headword can be one word
 * or a whole proverb (words.kind, see server/db/schema.ts), and character
 * count is a poor proxy for how wide Arabic actually sets.
 */
async function fittedSize(text: string, family: string, weight: string, sizes: number[], maxWidth: number) {
  const ref = await measureWidth(text, family, weight)
  for (const size of sizes) {
    if (ref * (size / REF_SIZE) <= maxWidth) return size
  }
  return sizes[sizes.length - 1]!
}

/** The MSA headword, its definition, and every dialect form as one "تُقال" sentence — the argument the site is built to show. */
export async function wordCardSvg(opts: { headword: string, definition: string | null, forms: CardForm[] }) {
  let head = `<text x="${CONTENT_RIGHT}" y="${LABEL_Y}" text-anchor="end" font-family="${SANS}" font-weight="600" font-size="44" fill="${MUTED}">بالفصحى</text>`

  const headword = clamp(opts.headword, 40)
  const headwordSize = await fittedSize(headword, NASKH, '700', [112, 92, 74, 58, 46], CONTENT_WIDTH)
  head += `<text x="${CONTENT_RIGHT}" y="${HEADWORD_Y}" text-anchor="end" font-family="${NASKH}" font-size="${headwordSize}" font-weight="700" fill="${INK}">${esc(headword)}</text>`

  if (opts.definition) {
    const definition = clamp(opts.definition, 64)
    const size = await fittedSize(definition, SANS, '400', [50, 44, 38, 33], CONTENT_WIDTH)
    head += `<text x="${CONTENT_RIGHT}" y="${DEFINITION_Y}" text-anchor="end" font-family="${SANS}" font-size="${size}" fill="${INK}">${esc(definition)}</text>`
  }
  head += `<line x1="${PAD}" y1="${RULE1_Y}" x2="${CONTENT_RIGHT}" y2="${RULE1_Y}" stroke="${HAIR}" stroke-width="4"/>`
  head += await paragraphSvg(opts.forms, RULE1_Y, RULE2_Y, CONTENT_RIGHT, CONTENT_WIDTH)

  return frame(head)
}

/** A dialect page's card: its name, description and how many words it has. */
export async function dialectCardSvg(opts: { nameAr: string, description: string | null, wordCount: number }) {
  let body = `<text x="${CONTENT_RIGHT}" y="${LABEL_Y}" text-anchor="end" font-family="${SANS}" font-weight="600" font-size="44" fill="${MUTED}">لهجة</text>`

  const name = clamp(opts.nameAr, 24)
  const nameSize = await fittedSize(name, NASKH, '700', [112, 92, 74, 58], CONTENT_WIDTH)
  body += `<text x="${CONTENT_RIGHT}" y="${HEADWORD_Y}" text-anchor="end" font-family="${NASKH}" font-size="${nameSize}" font-weight="700" fill="${INK}">${esc(name)}</text>`

  if (opts.description) {
    const description = clamp(opts.description, 64)
    const size = await fittedSize(description, SANS, '400', [50, 44, 38, 33], CONTENT_WIDTH)
    body += `<text x="${CONTENT_RIGHT}" y="${DEFINITION_Y}" text-anchor="end" font-family="${SANS}" font-size="${size}" fill="${INK}">${esc(description)}</text>`
  }
  body += `<line x1="${PAD}" y1="${RULE1_Y}" x2="${CONTENT_RIGHT}" y2="${RULE1_Y}" stroke="${HAIR}" stroke-width="4"/>`
  // A dialect page has far less to show than a word page — a name, one line,
  // done — so the count becomes a hero stat, centred in the same band the word
  // card gives its dialect line.
  const countLabel = opts.wordCount === 1 ? 'كلمة واحدة' : opts.wordCount === 2 ? 'كلمتان' : `${arabicDigits(opts.wordCount)} كلمة`
  const statSize = await fittedSize(countLabel, NASKH, '700', [180, 150, 120, 96], CONTENT_WIDTH)
  body += `<text x="${CONTENT_RIGHT}" y="${(RULE1_Y + RULE2_Y) / 2 + statSize * 0.3}" text-anchor="end" font-family="${NASKH}" font-size="${statSize}" font-weight="700" fill="${ACCENT}">${esc(countLabel)}</text>`
  return frame(body)
}

/**
 * The divergence ranking's own card (docs/REACH.md, Phase R4): the top words
 * as a scoreboard, word on one side and how many ways it is said on the other.
 * The page is meant to be screenshotted, and this is what a link to it should
 * look like when it is not.
 */
export async function divergentCardSvg(opts: { words: { headword: string, forms: number, groups: number }[] }) {
  let body = `<text x="${CONTENT_RIGHT}" y="${LABEL_Y}" text-anchor="end" font-family="${SANS}" font-weight="600" font-size="44" fill="${MUTED}">ترتيب</text>`
  body += `<text x="${CONTENT_RIGHT}" y="${HEADWORD_Y}" text-anchor="end" font-family="${NASKH}" font-size="96" font-weight="700" fill="${INK}">الأكثر اختلافاً</text>`
  body += `<text x="${CONTENT_RIGHT}" y="${DEFINITION_Y}" text-anchor="end" font-family="${SANS}" font-size="44" fill="${INK}">كلمات لكل لهجة فيها كلمة أخرى</text>`
  body += `<line x1="${PAD}" y1="${RULE1_Y}" x2="${CONTENT_RIGHT}" y2="${RULE1_Y}" stroke="${HAIR}" stroke-width="4"/>`

  const rows = opts.words.slice(0, 5)
  if (rows.length) {
    const rowHeight = 104
    // Centred in the band between the two rules, like the dialect line is.
    let y = (RULE1_Y + RULE2_Y) / 2 - ((rows.length - 1) * rowHeight) / 2 + 20
    for (const w of rows) {
      const headword = clamp(w.headword, 24)
      const size = await fittedSize(headword, NASKH, '700', [60, 52, 44, 38], CONTENT_WIDTH * 0.62)
      body += `<text x="${CONTENT_RIGHT}" y="${y}" text-anchor="end" font-family="${NASKH}" font-size="${size}" font-weight="700" fill="${INK}">${esc(headword)}</text>`
      body += `<text x="${PAD}" y="${y}" font-family="${SANS}" font-size="34" fill="${ACCENT}">${esc(`${arabicDigits(w.forms)} صيغة`)}</text>`
      y += rowHeight
    }
  }
  return frame(body)
}

/**
 * Rasterises an SVG string built above into a PNG buffer at exactly the card's
 * 1080×1350 — Instagram's own feed-post maximum, which is the ceiling the card
 * is designed against, so it is not rendered at 2x "for crispness": that only
 * ships an image twice the size it is allowed to be, and the platform
 * downsamples it anyway.
 */
export async function renderCardPng(svg: string): Promise<Buffer> {
  const resvg = new Resvg(svg, {
    font: { fontFiles: await fonts(), loadSystemFonts: false, defaultFontFamily: SANS },
    background: PAPER,
    shapeRendering: 2,
    textRendering: 2,
  })
  return Buffer.from(resvg.render().asPng())
}
