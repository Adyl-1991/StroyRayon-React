import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const distDir = path.resolve('dist')
const assetsDir = path.join(distDir, 'assets')
const html = await readFile(path.join(distDir, 'index.html'), 'utf8')
const entryMatch = html.match(/<script[^>]+src="\/assets\/([^"]+\.js)"/)

assert.ok(entryMatch, 'Production HTML must reference a JavaScript entry asset')

const entryFile = entryMatch[1]
const entryBytes = (await stat(path.join(assetsDir, entryFile))).size
const assetNames = await readdir(assetsDir)
const productDataChunk = assetNames.find((name) => /^productService-.*\.js$/.test(name))
const adminCssChunk = assetNames.find((name) => /^admin-.*\.css$/.test(name))
const requiredRouteChunks = [
  'HomePage-',
  'CatalogPage-',
  'ProductPage-',
  'CheckoutPage-',
  'AdminLoginPage-',
  'AdminProductDetailPage-',
]

assert.ok(entryBytes <= 300_000, `Entry bundle is too large: ${entryBytes} bytes`)
assert.ok(productDataChunk, 'Catalog fallback data must remain in a lazy productService chunk')
assert.notEqual(entryFile, productDataChunk, 'Catalog fallback data must not be the entry bundle')
assert.ok(adminCssChunk, 'Admin CSS must be emitted separately from storefront CSS')

for (const prefix of requiredRouteChunks) {
  assert.ok(assetNames.some((name) => name.startsWith(prefix) && name.endsWith('.js')), `Missing lazy route chunk: ${prefix}`)
}

console.log(JSON.stringify({
  passed: true,
  entryFile,
  entryBytes,
  entryReductionFromBaselinePercent: Number((100 - (entryBytes / 2_036_685) * 100).toFixed(1)),
  productDataChunk,
  productDataBytes: (await stat(path.join(assetsDir, productDataChunk))).size,
  adminCssChunk,
  lazyRouteChunksChecked: requiredRouteChunks.length,
}, null, 2))
