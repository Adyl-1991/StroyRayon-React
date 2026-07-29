import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const apiRoot = path.resolve(process.cwd())
const projectRoot = path.resolve(apiRoot, '..')
const seedSource = readFileSync(path.join(apiRoot, 'prisma', 'seed.ts'), 'utf8')
const renderSource = readFileSync(path.join(projectRoot, 'render.yaml'), 'utf8')

test('production catalog sync deactivates stale products instead of deleting them', () => {
  assert.doesNotMatch(seedSource, /prisma\.product\.deleteMany/)
  assert.match(seedSource, /staleProductsDeactivated/)
  assert.match(seedSource, /data:\s*\{\s*isActive:\s*false\s*\}/)
})

test('production catalog sync preserves manual fields, stock rows and uploaded images', () => {
  assert.match(seedSource, /auditLogs:\s*\{\s*select:\s*\{\s*changedFields:\s*true/)
  assert.match(seedSource, /image\.storageDriver !== 'legacy'/)
  assert.match(seedSource, /if \(!existing\?\.stock\)/)
  assert.match(seedSource, /wasEdited\('price'\)/)
  assert.match(seedSource, /wasEdited\('stock', 'stockStatus'\)/)
})

test('production catalog sync has a catalog-size guard and runs before each Render release', () => {
  assert.match(seedSource, /products\.length < 300/)
  assert.match(seedSource, /stats\.skippedProducts\.length \|\| stats\.warnings\.length/)
  assert.match(
    renderSource,
    /preDeployCommand:\s*cd api && npx prisma migrate deploy && npm run prisma:seed/,
  )
})
