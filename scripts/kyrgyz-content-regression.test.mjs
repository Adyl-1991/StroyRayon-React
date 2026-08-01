import test from 'node:test'
import assert from 'node:assert/strict'
import { auditKyrgyzContent } from './kyrgyz-content-audit.mjs'
import { normalizeKyrgyzContent, normalizeKyrgyzText } from '../src/i18n/kyrgyzText.js'

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
