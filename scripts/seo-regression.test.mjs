import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { normalizeSiteUrl, siteConfig } from '../src/config/site.js'
import { buildOrganizationStructuredData } from '../src/utils/seoUtils.js'
import { formatSeoTitle, getCanonicalUrl, getRobotsContent } from '../src/utils/seoMeta.js'

test('production domain aliases normalize to the www canonical origin', () => {
  assert.equal(normalizeSiteUrl('https://stroyrayon.kg'), 'https://www.stroyrayon.kg')
  assert.equal(normalizeSiteUrl('https://www.stroyrayon.kg/'), 'https://www.stroyrayon.kg')
  assert.equal(normalizeSiteUrl('http://127.0.0.1:5173/path'), 'http://127.0.0.1:5173')
  assert.equal(siteConfig.siteUrl, 'https://www.stroyrayon.kg')
})

test('SEO titles include the brand exactly once', () => {
  assert.equal(formatSeoTitle('StroyRayon'), 'StroyRayon')
  assert.equal(formatSeoTitle('ППР түтүк кескич'), 'ППР түтүк кескич | StroyRayon')
  assert.equal(formatSeoTitle('ППР түтүк кескич - StroyRayon'), 'ППР түтүк кескич - StroyRayon')
  assert.equal(formatSeoTitle('ППР түтүк кескич | StroyRayon'), 'ППР түтүк кескич | StroyRayon')
})

test('canonical URLs use www and omit query strings and trailing slashes', () => {
  assert.equal(
    getCanonicalUrl('https://stroyrayon.kg/product/ppr-tutuk-keskich/?campaign=test'),
    'https://www.stroyrayon.kg/product/ppr-tutuk-keskich',
  )
  assert.equal(
    getCanonicalUrl(undefined, { pathname: '/catalog/' }),
    'https://www.stroyrayon.kg/catalog',
  )
})

test('indexability directives are explicit', () => {
  assert.equal(getRobotsContent(false), 'index, follow')
  assert.equal(getRobotsContent(true), 'noindex, nofollow, noarchive')
})

test('organization schema identifies Latin and Cyrillic brand aliases', () => {
  const organization = buildOrganizationStructuredData()
  assert.equal(organization.name, 'StroyRayon')
  assert.deepEqual(organization.alternateName, ['Stroy Rayon', 'СтройРайон', 'Строй Район'])
  assert.equal(organization.url, 'https://www.stroyrayon.kg')
})

test('generated crawler files use only the final www host', async () => {
  const [sitemap, robots] = await Promise.all([
    readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8'),
    readFile(new URL('../public/robots.txt', import.meta.url), 'utf8'),
  ])

  assert.match(robots, /Sitemap: https:\/\/www\.stroyrayon\.kg\/sitemap\.xml/)
  assert.doesNotMatch(robots, /https:\/\/stroyrayon\.kg/)
  assert.match(sitemap, /<loc>https:\/\/www\.stroyrayon\.kg/)
  assert.doesNotMatch(sitemap, /<loc>https:\/\/stroyrayon\.kg/)
  assert.match(sitemap, /\/product\/kabel-kanal-25x16-2<\/loc>/)
  assert.doesNotMatch(sitemap, /\/product\/kabel-kanal-16x16<\/loc>/)
})

test('Vercel sends noindex headers for private and transactional routes', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  const noIndexSources = config.headers
    .filter((entry) => entry.headers?.some((header) => header.key === 'X-Robots-Tag'))
    .map((entry) => entry.source)

  assert.deepEqual(noIndexSources, ['/admin/(.*)', '/search', '/cart', '/checkout'])
})
