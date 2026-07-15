import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getLocalizedUnitText,
  getProductListField,
  getProductSpecs,
  normalizeProduct,
} from '../src/services/productService.js'
import { products } from '../src/data/products.js'

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

test('2 m cable channel keeps one consistent bilingual sales unit', () => {
  const product = products.find((item) => item.id === 'cable-channel-25x16')

  assert.ok(product)
  assert.equal(product.slug, 'kabel-kanal-25x16-2')
  assert.equal(product.sku, 'SR-ELC-CHN-2516-2M')
  assert.equal(product.brand, 'ElectroSafe')
  assert.equal(product.unit, 'даана')
  assert.equal(product.unitRu, 'шт.')
  assert.equal(product.minOrder, '1 даана')
  assert.equal(product.minOrderRu, '1 шт.')
  assert.equal(product.packageInfoKg, '1 даана (узундугу 2 м)')
  assert.equal(product.packageInfoRu, '1 шт. (длина 2 м)')
  assert.equal(product.specs['Сатуу бирдиги'], 'даана')
  assert.equal(product.specificationsRu['Единица продажи'], 'шт.')
  assert.equal(product.specificationsRu.Цвет, 'белый')
  assert.equal(product.faqRu.length, 4)
})
