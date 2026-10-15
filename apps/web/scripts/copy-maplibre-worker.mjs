// MapLibre v6 loads its web worker from a separate file that bundlers don't emit.
// Copy it into /public so the app can serve it and point setWorkerUrl() at it.
import { copyFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const dist = dirname(require.resolve('maplibre-gl/package.json'))
const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'maplibre-gl-worker.mjs')
copyFileSync(join(dist, 'dist', 'maplibre-gl-worker.mjs'), target)
console.log(`Copied MapLibre worker → ${target}`)
