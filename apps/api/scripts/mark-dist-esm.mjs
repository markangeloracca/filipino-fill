// Vercel deploys the contents of dist/ as the function root, without this package's
// package.json. Mark the compiled output as ESM so Node loads main.js as a module.
import { writeFileSync } from 'node:fs'

writeFileSync(new URL('../dist/package.json', import.meta.url), `${JSON.stringify({ type: 'module' })}\n`)
