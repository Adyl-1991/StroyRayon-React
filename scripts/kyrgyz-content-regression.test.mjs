import test from 'node:test'
import assert from 'node:assert/strict'
import { auditKyrgyzContent } from './kyrgyz-content-audit.mjs'
import { normalizeKyrgyzText } from '../src/i18n/kyrgyzText.js'

test('all public Kyrgyz content passes the language and copy audit', () => {
  const result = auditKyrgyzContent()

  assert.equal(result.activeProducts, 246)
  assert.ok(result.checkedStrings > 9000)
  assert.deepEqual(result.languageLeakage, [])
  assert.deepEqual(result.mojibake, [])
  assert.deepEqual(result.repeatedWords, [])
  assert.deepEqual(result.spacing, [])
  assert.deepEqual(result.orthography, [])
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
