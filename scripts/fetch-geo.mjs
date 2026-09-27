// Downloads the two IP databases the search-miss log looks visitors up in
// (server/utils/searchVisitor.ts) into .data/geo:
//
//   user-country.mmdb  IP → country
//   origin-asn.mmdb    IP → the network that announces it (an ISP, or a cloud provider)
//
// Both come from github.com/sapics/ip-location-db, rebuilt daily from public
// registry and routing data and released under the PDDL (public domain, no
// attribution needed). The Docker build runs this on every deploy, so the data
// is as fresh as the last push; locally, `npm run geo` once is enough.
//
// Never fails: without the files the site runs as before and the log simply
// leaves country and network empty. A download is written to a temporary name
// and renamed, so a broken one never replaces a good one.
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const BASE = 'https://github.com/sapics/ip-location-db/releases/download/latest/'
const FILES = ['user-country.mmdb', 'origin-asn.mmdb']
const dir = resolve(process.cwd(), '.data/geo')

await mkdir(dir, { recursive: true })
for (const name of FILES) {
  try {
    const res = await fetch(BASE + name, { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = Buffer.from(await res.arrayBuffer())
    // Every MaxMind-format file ends its data with this marker before the metadata.
    if (!body.includes(Buffer.from('\xab\xcd\xefMaxMind.com', 'latin1'))) throw new Error('not an mmdb file')
    await writeFile(`${dir}/${name}.tmp`, body)
    await rename(`${dir}/${name}.tmp`, `${dir}/${name}`)
    console.log(`[geo] ${name}: ${(body.length / 1e6).toFixed(1)} MB`)
  } catch (e) {
    console.warn(`[geo] ${name} not updated: ${e instanceof Error ? e.message : e}`)
  }
}
