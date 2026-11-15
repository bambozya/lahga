/**
 * The palette (docs/ROADMAP.md B2): ink, paper, one colour, and a green that
 * the games alone use for a right answer (#48: red reads as "wrong"). The share cards
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
    right: '#2f6b3a', // a right answer in the games, and nothing else; 5.8:1 on paper, so it can carry text
  },
  dark: {
    paper: '#15130f',
    surface: '#1f1c16',
    ink: '#f1ede4',
    muted: '#aaa397',
    hair: '#3b372e',
    accent: '#ff8466',
    right: '#7fd08a', // 10:1 on dark paper
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

/**
 * The nuqta (#49): the rhombic dot of the jeem in the logo, as a path in a
 * 100×100 box, tilted as the pen leaves it. Drawn by the share cards
 * (server/utils/ogCard.ts) and, as the `--nuqta` and `--nuqta-open` masks in
 * app/assets/css/main.css, by the site; tests/unit/palette.test.ts fails when
 * the CSS copy and this one differ, so the shape is defined once.
 */
export const NUQTA_PATH = 'M35.4 5.1Q39.5 -0.3 46.9 1.7Q60.5 6.5 73.1 13.9Q85.7 21.4 96.6 31Q102 36.4 98.6 43.2L66 94.9Q61.2 101.7 53.7 96.3Q46.9 90.8 4.8 65.6Q-2.7 60.9 2 54.1L35.4 5.1Z'
