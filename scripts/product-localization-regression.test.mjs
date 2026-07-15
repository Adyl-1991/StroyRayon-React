import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getLocalizedUnitText,
  getProductListField,
  getProductSpecs,
  normalizeProduct,
} from '../src/services/productService.js'

test('Russian commercial values translate Kyrgyz unit words safely', () => {
  assert.equal(getLocalizedUnitText('1 даана', 'ru'), '1 шт.')
  assert.equal(getLocalizedUnitText('Метраж менен кесилип берилет.', 'ru'), 'Отрезается по метражу.')
  assert.equal(getLocalizedUnitText('10 метр', 'ru'), '10 метр')
  assert.equal(getLocalizedUnitText('1 даана', 'kg'), '1 даана')
})

test('Russian pages do not silently reuse Kyrgyz specs and FAQ', () => {
  const product = normalizeProduct({
    id: 'mixed-language-product',
    titleKg: 'Товар',
    titleRu: 'Товар',
    specs: { Түсү: 'ак' },
    faqKg: [{ question: 'Суроо?', answer: 'Жооп.' }],
    unit: 'даана',
    minOrder: '1 даана',
  })

  assert.deepEqual(getProductSpecs(product, 'ru'), {})
  assert.deepEqual(getProductListField(product, 'faq', 'ru'), [])
  assert.deepEqual(getProductSpecs(product, 'kg'), { Түсү: 'ак' })
  assert.equal(product.minOrderRu, '1 шт.')
})

test('real Russian specs and FAQ remain available when supplied', () => {
  const product = normalizeProduct({
    id: 'localized-product',
    specificationsKg: { Түсү: 'ак' },
    specificationsRu: { Цвет: 'белый' },
    faqKg: [{ question: 'Суроо?', answer: 'Жооп.' }],
    faqRu: [{ question: 'Вопрос?', answer: 'Ответ.' }],
  })

  assert.deepEqual(getProductSpecs(product, 'ru'), { Цвет: 'белый' })
  assert.deepEqual(getProductListField(product, 'faq', 'ru'), [{ question: 'Вопрос?', answer: 'Ответ.' }])
})
