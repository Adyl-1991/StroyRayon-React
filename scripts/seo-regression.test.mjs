import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { normalizeSiteUrl, siteConfig } from '../src/config/site.js'
import { products } from '../src/data/products.js'
import {
  buildFaqStructuredData,
  buildOrganizationStructuredData,
  buildProductStructuredData,
  buildWebSiteStructuredData,
} from '../src/utils/seoUtils.js'
import { formatSeoTitle, getCanonicalUrl, getRobotsContent } from '../src/utils/seoMeta.js'
import { buildRouteDefinitions, injectSeo } from './prerender-seo.mjs'

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
  assert.equal(formatSeoTitle('StroyRayon жөнүндө'), 'StroyRayon жөнүндө')
  assert.equal(
    formatSeoTitle('ППР түтүк PN20 - баасы жана заказ StroyRayon'),
    'ППР түтүк PN20 - баасы жана заказ StroyRayon',
  )
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
  assert.equal(
    getRobotsContent(false),
    'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  )
  assert.equal(getRobotsContent(true), 'noindex, nofollow, noarchive')
})

test('organization schema identifies Latin and Cyrillic brand aliases', () => {
  const organization = buildOrganizationStructuredData()
  assert.equal(organization.name, 'StroyRayon')
  assert.deepEqual(organization.alternateName, ['Stroy Rayon', 'СтройРайон', 'Строй Район'])
  assert.equal(organization.url, 'https://www.stroyrayon.kg')
  assert.equal(organization.telephone, '+996 553 12 19 91')
  assert.equal(organization.address.addressLocality, 'Бишкек')
})

test('website, product and FAQ schemas contain usable public data', () => {
  const website = buildWebSiteStructuredData()
  const productWithPriceByRequest = products.find((product) => !Number(product.price))
  const productSchema = buildProductStructuredData(productWithPriceByRequest)
  const faq = buildFaqStructuredData([{ question: 'Суроо?', answer: 'Жооп.' }])

  assert.equal(website['@id'], 'https://www.stroyrayon.kg/#website')
  assert.equal(website.publisher['@id'], 'https://www.stroyrayon.kg/#organization')
  assert.equal(productSchema['@type'], 'Product')
  assert.equal(productSchema.offers, undefined)
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, 'Жооп.')
})

test('SEO prerender covers every public route with unique route metadata', () => {
  const routes = buildRouteDefinitions()
  const productSeo = routes.get('/product/wago-tip-klemma-3-orun')
  const catalogSeo = routes.get('/catalog/inzhenerdik-santehnika')
  const html = injectSeo(
    '<!doctype html><html><head><meta name="description" content="generic"><title>StroyRayon</title></head><body><div id="root"></div></body></html>',
    productSeo,
  )

  assert.equal(routes.size, 412)
  assert.equal(productSeo.canonical, 'https://www.stroyrayon.kg/product/wago-tip-klemma-3-orun')
  assert.equal(catalogSeo.canonical, 'https://www.stroyrayon.kg/catalog/inzhenerdik-santehnika')
  assert.match(html, /<title>WAGO тип клемма 3 орун[^<]*StroyRayon<\/title>/)
  assert.match(html, /rel="canonical" href="https:\/\/www\.stroyrayon\.kg\/product\/wago-tip-klemma-3-orun"/)
  assert.match(html, /application\/ld\+json/)
  assert.match(html, /data-seo-prerender="true"/)
  assert.match(html, /<h1>WAGO тип клемма 3 орун<\/h1>/)
  assert.match(html, /22 сом \/ даана/)
  assert.equal((html.match(/name="description"/g) || []).length, 1)
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

  products
    .filter((product) => product.isActive !== false)
    .forEach((product) => {
      assert.match(
        sitemap,
        new RegExp(`/product/${product.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/loc>`),
        product.slug,
      )
    })
})

test('Vercel sends noindex headers for private and transactional routes', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  const noIndexSources = config.headers
    .filter((entry) => entry.headers?.some((header) => header.key === 'X-Robots-Tag'))
    .map((entry) => entry.source)

  assert.deepEqual(noIndexSources, ['/admin/(.*)', '/admin', '/search', '/cart', '/checkout'])

  const redirects = new Map(config.redirects.map((entry) => [entry.source, entry.destination]))
  assert.equal(redirects.get('/product/kabel-vvgng'), '/product/kabel-vvgng-3x2-5')
  assert.equal(redirects.get('/product/gips-shtukaturka'), '/product/gips-shtukaturkasy-30kg')
  assert.equal(redirects.get('/product/smesitel-kuhnya'), '/product/ashkana-smesiteli-basic')
})

test('production build runs SEO prerender and Vercel includes the generator', async () => {
  const [packageJson, vercelIgnore] = await Promise.all([
    readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../.vercelignore', import.meta.url), 'utf8'),
  ])

  assert.equal(packageJson.scripts.postbuild, 'node scripts/prerender-seo.mjs')
  assert.match(vercelIgnore, /!\/scripts\/prerender-seo\.mjs/)
})
