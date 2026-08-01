import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { getHomePopularProducts } from '../src/services/productService.js'

const carouselSource = await readFile(
  new URL('../src/components/home/ProductCarousel.jsx', import.meta.url),
  'utf8',
)
const homeSectionsSource = await readFile(
  new URL('../src/components/home/HomeProductSections.jsx', import.meta.url),
  'utf8',
)
const globalCssSource = await readFile(
  new URL('../src/styles/global.css', import.meta.url),
  'utf8',
)

const homeGroups = [
  'stroymaterial',
  'instrument',
  'elektrika',
  'santehnika',
  'ventilyaciya',
  'krepezh',
  'boiok-tush-kagaz',
  'bak-koroo',
]

test('home popular products stay balanced at two unique active products per group', () => {
  const products = homeGroups.flatMap((slug) => [
    { id: `${slug}-first`, name: `${slug} first`, catalogPath: [slug] },
    { id: `${slug}-second`, name: `${slug} second`, catalogPath: [slug] },
    { id: `${slug}-inactive`, name: `${slug} inactive`, catalogPath: [slug], isActive: false },
  ])

  const selected = getHomePopularProducts(products)

  assert.equal(selected.length, homeGroups.length * 2)
  assert.deepEqual(
    selected.slice(0, homeGroups.length).map((product) => product.id),
    homeGroups.map((slug) => `${slug}-first`),
  )
  assert.deepEqual(
    selected.slice(homeGroups.length).map((product) => product.id),
    homeGroups.map((slug) => `${slug}-second`),
  )
  assert.equal(new Set(selected.map((product) => product.id)).size, selected.length)
  assert.ok(selected.every((product) => product.isActive !== false))
})

test('home popular products preserve preferred merchandising choices', () => {
  const products = [
    { id: 'cement-fallback', name: 'Fallback cement', catalogPath: ['stroymaterial'] },
    { id: 'cement-m500-50kg', name: 'Preferred cement', catalogPath: ['stroymaterial'] },
    { id: 'drill-fallback', name: 'Fallback drill', catalogPath: ['instrument'] },
    { id: 'drill-650w', name: 'Preferred drill', catalogPath: ['instrument'] },
  ]

  assert.deepEqual(
    getHomePopularProducts(products).map((product) => product.id),
    ['cement-m500-50kg', 'drill-650w', 'cement-fallback', 'drill-fallback'],
  )
})

test('home uses the accessible product carousel with enough API candidates', () => {
  assert.match(homeSectionsSource, /useProducts\(\{ limit: 64, sort: 'popular' \}\)/)
  assert.match(homeSectionsSource, /<ProductCarousel products=\{popularProducts\} \/>/)
  assert.match(carouselSource, /export function ProductCarousel\(\{ products = \[\] \}\)/)
  assert.match(carouselSource, /role="region"/)
  assert.match(carouselSource, /aria-label=\{labels\.label\}/)
  assert.match(carouselSource, /mediaQuery\.addEventListener\?\.\('change', updatePreference\)/)
  assert.match(carouselSource, /mediaQuery\.removeEventListener\?\.\('change', updatePreference\)/)
  assert.match(carouselSource, /window\.clearInterval\(intervalId\)/)
  assert.match(carouselSource, /setIsPlaying\(false\)/)
  assert.match(carouselSource, /!prefersReducedMotion && \(/)
})

test('carousel layout remains responsive and honors reduced-motion preferences', () => {
  assert.match(globalCssSource, /\.product-carousel__item\s*\{[^}]*flex: 0 0 calc\(\(100% - 48px\) \/ 4\);/s)
  assert.match(globalCssSource, /@media \(max-width: 939px\)\s*\{[^}]*\.product-carousel__item\s*\{[^}]*calc\(\(100% - 16px\) \/ 2\)/s)
  assert.match(globalCssSource, /@media \(max-width: 600px\)\s*\{[\s\S]*?\.product-carousel__item\s*\{[^}]*min\(84vw, 320px\)/s)
  assert.match(globalCssSource, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.product-carousel__viewport\s*\{[^}]*scroll-behavior: auto;/s)
})
