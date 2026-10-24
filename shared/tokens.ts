/**
 * The palette (docs/ROADMAP.md B2): ink, paper and one colour. The share cards
 * (server/utils/ogCard.ts) and the emails (server/utils/email.ts) import it;
 * app/assets/css/main.css keeps its own copy as `light-dark(light, dark)`
 * pairs, because CSS should stay plain CSS. tests/unit/palette.test.ts fails
 * when the two disagree, and when public/favicon.svg uses a colour that is not
 * here, so changing a colour is an edit in this file and one in main.css (and
 * for `mark`, in public/favicon.svg and the PNG icons beside it).
 *
 * `light` is what the cards and the emails use: both are seen on someone
 * else's screen, where the reader's theme is unknown, so they stay on paper.
 */
export const PALETTE = {
  light: {
    paper: '#f6f3ec', // the page
    surface: '#fffdf9', // a raised panel: form fields, the email card
    ink: '#16140f', // text, the heavy rule
    muted: '#5c574c', // secondary text
    hair: '#d5cfc0', // thin rules and borders
    accent: '#b8321a', // the one colour: the nuqta, links on hover, the active tab
  },
  dark: {
    paper: '#15130f',
    surface: '#1f1c16',
    ink: '#f1ede4',
    muted: '#aaa397',
    hair: '#3b372e',
    accent: '#ff8466',
  },
  /**
   * The brand mark on its own: the nuqta on an ink tile (public/favicon.svg,
   * the app icons). Brighter than `light.accent`, which nearly disappears on a
   * dark tile at tab size, and redder than `dark.accent`, which turns salmon
   * there. Chosen by eye, 2026-10-24. Not used in the page itself.
   */
  mark: {
    tile: '#16140f', // = light.ink
    nuqta: '#e8492e',
  },
} as const

export type ColourName = keyof typeof PALETTE.light
