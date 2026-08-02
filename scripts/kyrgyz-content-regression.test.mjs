import test from 'node:test'
import assert from 'node:assert/strict'
import { auditKyrgyzContent } from './kyrgyz-content-audit.mjs'
import { products } from '../src/data/products.js'
import { findKyrgyzLanguageLeakage, normalizeKyrgyzContent, normalizeKyrgyzText } from '../src/i18n/kyrgyzText.js'

test('all public Kyrgyz content passes the language and copy audit', () => {
  const result = auditKyrgyzContent()

  assert.equal(result.activeProducts, 181)
  assert.ok(result.checkedStrings > 5000)
  assert.deepEqual(result.languageLeakage, [])
  assert.deepEqual(result.mojibake, [])
  assert.deepEqual(result.repeatedWords, [])
  assert.deepEqual(result.spacing, [])
  assert.deepEqual(result.orthography, [])
  assert.deepEqual(result.transliteratedProductTitles, [])
  assert.deepEqual(result.missingProductCopy, [])
})

test('mixed catalogue terminology is converted to clear Kyrgyz wording', () => {
  assert.equal(
    normalizeKyrgyzText('Менеджерден заказ жана наличие боюнча сураңыз.'),
    'Адистен буйрутма жана бар-жогу боюнча сураңыз.',
  )
  assert.equal(
    normalizeKyrgyzText('Стяжкадагы финиш катмар үчүн расход запасын эсептеңиз.'),
    'Пол тегиздөөчү катмардагы акыркы катмар үчүн сарпталыш корун эсептеңиз.',
  )
})

test('recursive Kyrgyz normalization preserves URLs while translating visible copy', () => {
  const route = '/catalog/stroymaterial/kurgak-aralashmalar/gidroizolyaciya'
  const canonical = `https://www.stroyrayon.kg${route}`
  const normalized = normalizeKyrgyzContent({
    label: 'gidroizolyaciya аралашмасы',
    route,
    canonical,
  })

  assert.equal(normalized.route, route)
  assert.equal(normalized.canonical, canonical)
  assert.notEqual(normalized.label, 'gidroizolyaciya аралашмасы')
})

test('verified Knauf descriptions are not replaced by generic catalog copy', () => {
  const rotband = products.find((product) => product.slug === 'knauf-rotband-30kg')
  const mp75 = products.find((product) => product.slug === 'knauf-mp-75-30kg')

  assert.match(rotband.descriptionKg, /полимер кошулмалары бар гипс негизиндеги/)
  assert.match(rotband.descriptionKg, /Q3 сапат деңгээлине/)
  assert.match(mp75.descriptionKg, /PFT G4, G5 жана Ritmo M\/L\/XL/)
  assert.match(mp75.descriptionKg, /Q3 сапат деңгээлине/)
})

test('customer-facing primer clarification remains allowed only in its exact parenthetical form', () => {
  assert.deepEqual(findKyrgyzLanguageLeakage('Курулуш астарлары (грунтовкасы)'), [])
  assert.notDeepEqual(findKyrgyzLanguageLeakage('Грунтовка для стен'), [])
})
