import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Boots the built app (`npm run build` first) on a fresh embedded database and
 * fetches the pages a visitor lands on (docs/ROADMAP.md A6). The database
 * lives in a throwaway folder: the app keeps PGlite and looks for its
 * migrations relative to the working directory, so starting it from an empty
 * folder that links to drizzle/ gives it a clean database every run, seeded
 * with the dialect tree and the sample words of server/db/seed-data.ts.
 */
const root = resolve(__dirname, '../..')
const entry = join(root, '.output/server/index.mjs')

let server: ChildProcess
let base = ''
let workdir = ''
let output = ''

const freePort = () => new Promise<number>((done) => {
  const s = createServer().listen(0, () => {
    const { port } = s.address() as { port: number }
    s.close(() => done(port))
  })
})

beforeAll(async () => {
  if (!existsSync(entry)) throw new Error('No build found: run `npm run build` before `npm run test:smoke`.')
  workdir = mkdtempSync(join(tmpdir(), 'lahga-smoke-'))
  symlinkSync(join(root, 'drizzle'), join(workdir, 'drizzle'))
  const port = await freePort()
  base = `http://127.0.0.1:${port}`

  const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(port), HOST: '127.0.0.1', NUXT_SESSION_PASSWORD: 'smoke-test-session-password-of-at-least-32-chars' }
  delete env.DATABASE_URL
  server = spawn(process.execPath, [entry], { cwd: workdir, env })
  server.stdout?.on('data', d => (output += d))
  server.stderr?.on('data', d => (output += d))

  // Migrations and the seed run on the first request, so allow them time.
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    const ok = await fetch(`${base}/api/health`).then(r => r.ok, () => false)
    if (ok) return
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`The app did not become healthy within 90 s. Its output:\n${output}`)
}, 120_000)

afterAll(() => {
  server?.kill('SIGINT')
  if (workdir) rmSync(workdir, { recursive: true, force: true })
})

describe('the built app', () => {
  it('serves the pages a visitor lands on', async () => {
    const words = await (await fetch(`${base}/api/words?limit=1`)).json() as { slug: string }[]
    expect(words.length, 'the seed should give the dictionary at least one word').toBeGreaterThan(0)

    const pages = ['/', '/about', '/dialects', '/d/egyptian', `/w/${encodeURIComponent(words[0]!.slug)}`, '/daily']
    for (const path of pages) {
      const res = await fetch(base + path)
      const html = await res.text()
      expect(res.status, `${decodeURIComponent(path)} answered ${res.status}`).toBe(200)
      expect(html, `${decodeURIComponent(path)} rendered no heading`).toContain('<h1')
    }
  }, 60_000)
})
