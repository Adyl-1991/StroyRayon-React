import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const apiRoot = path.resolve(process.cwd())
const projectRoot = path.resolve(apiRoot, '..')
const seedSource = readFileSync(path.join(apiRoot, 'prisma', 'seed.ts'), 'utf8')
const packageSource = readFileSync(path.join(apiRoot, 'package.json'), 'utf8')
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

test('production catalog sync has a catalog-size guard and runs before API startup', () => {
  assert.match(seedSource, /products\.length < 180/)
  assert.match(seedSource, /stats\.skippedProducts\.length \|\| stats\.warnings\.length/)
  assert.match(packageSource, /"prestart:prod":\s*"prisma migrate deploy && npm run prisma:seed"/)
  assert.match(
    renderSource,
    /preDeployCommand:\s*cd api && npx prisma migrate deploy/,
  )
})

test('production catalog sync safely rekeys split CHINT products and transfers 4P variants', () => {
  assert.match(seedSource, /'chint-rcd-nl1-100':\s*'chint-rcd-nl-100'/)
  assert.match(seedSource, /'chint-rcd-nl1-63-2p':\s*'chint-rcd-nl-63'/)
  assert.match(seedSource, /'chint-relays-njyw1':\s*'chint-rcd-uzo'/)
  assert.match(seedSource, /'CHINT-APR26-B241':\s*'chint-rcd-nl1-63-4p'/)
  assert.match(seedSource, /shouldTransfer\s*\?\s*\{\s*productId\s*\}/)
  assert.match(seedSource, /transferredVariants/)
})
