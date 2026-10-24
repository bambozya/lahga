import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PALETTE } from '../../shared/tokens'

// main.css keeps its own copy of the palette (CSS stays plain CSS), so this is
// what keeps the copy honest (docs/ROADMAP.md B2): change a colour in one place
// and forget the other, and this fails with the name of the colour.
const root = resolve(__dirname, '../..')
const css = readFileSync(resolve(root, 'app/assets/css/main.css'), 'utf8')
const favicon = readFileSync(resolve(root, 'public/favicon.svg'), 'utf8')

/** `--name: light-dark(#light, #dark);` from the first :root block. */
function cssPalette() {
  const block = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? ''
  const found: Record<string, { light: string, dark: string }> = {}
  for (const m of block.matchAll(/--([a-z-]+):\s*light-dark\(\s*(#[0-9a-f]{3,8})\s*,\s*(#[0-9a-f]{3,8})\s*\)/gi)) {
    found[m[1]!] = { light: m[2]!.toLowerCase(), dark: m[3]!.toLowerCase() }
  }
  return found
}

describe('the palette', () => {
  const fromCss = cssPalette()

  it('main.css defines every colour shared/tokens.ts has, with the same values', () => {
    for (const name of Object.keys(PALETTE.light) as (keyof typeof PALETTE.light)[]) {
      expect(fromCss[name], `--${name} is missing from main.css`).toBeDefined()
      expect(fromCss[name]!.light, `--${name}, light`).toBe(PALETTE.light[name])
      expect(fromCss[name]!.dark, `--${name}, dark`).toBe(PALETTE.dark[name])
    }
  })

  it('main.css has no colour that shared/tokens.ts does not know', () => {
    expect(Object.keys(fromCss).sort()).toEqual(Object.keys(PALETTE.light).sort())
  })

  it('keeps the mark\'s tile the same ink as the page', () => {
    expect(PALETTE.mark.tile).toBe(PALETTE.light.ink)
  })

  it('the favicon only uses colours from the palette', () => {
    const known = new Set([...Object.values(PALETTE.light), ...Object.values(PALETTE.dark), ...Object.values(PALETTE.mark)])
    const used = [...favicon.matchAll(/#[0-9a-f]{6}\b/gi)].map(m => m[0].toLowerCase())
    expect(used.length).toBeGreaterThan(0)
    for (const colour of used) expect(known, `public/favicon.svg uses ${colour}`).toContain(colour)
  })
})
