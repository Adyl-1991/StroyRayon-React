import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getLocalizedUnitText,
  getProductListField,
  getProductTitle,
  getProductSpecs,
  isRedundantProductText,
  normalizeProduct,
  resolveProductSlug,
} from '../src/services/productService.js'
import { products } from '../src/data/products.js'

test('Russian commercial values translate Kyrgyz unit words safely', () => {
  assert.equal(getLocalizedUnitText('1 даана', 'ru'), '1 шт.')
  assert.equal(getLocalizedUnitText('Метраж менен кесилип берилет.', 'ru'), 'Отрезается по метражу.')
  assert.equal(getLocalizedUnitText('10 метр', 'ru'), '10 метр')
  assert.equal(getLocalizedUnitText('1 даана', 'kg'), '1 даана')
})

test('card copy does not repeat measurements already present in the title', () => {
  const title = 'Гипсовая штукатурка Knauf Rotband, 30 кг'

  assert.equal(isRedundantProductText('30 кг мешок', title), true)
  assert.equal(isRedundantProductText('Гипсовая штукатурка', title), true)
  assert.equal(isRedundantProductText('1 мешок', title), false)
  assert.equal(isRedundantProductText('SR-MIX-KRB-30', title), false)
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

test('API-first products resolve Kyrgyz product types from the catalogue tree', () => {
  const apiProduct = normalizeProduct({
    id: 'alinex-api-list-item',
    slug: 'alinex-stukaturka-dlia-dekorativnoi-otdelki-munfort-f-35',
    titleKg: 'Штукатурка для декоративной отделки MUNFORT F 3,5',
    titleRu: 'Штукатурка для декоративной отделки MUNFORT F 3,5',
    catalogPath: ['stroymaterial', 'kurgak-aralashmalar', 'shtukaturkalar', 'dekorativdik-shtukaturka'],
  })

  assert.equal(apiProduct.productTypeKg, 'Декоративдик штукатурка')
  assert.equal(apiProduct.productTypeRu, 'Декоративная штукатурка')
  assert.equal(getProductTitle(apiProduct, 'kg'), 'Декоративдик шыбак AlinEX MUNFORT F 3,5')
  assert.doesNotMatch(getProductTitle(apiProduct, 'kg'), /dekorativdik-shtukaturka/)
})

test('AlinEX primer titles explain the Kyrgyz term with the familiar product name', () => {
  const primer = products.find((product) => product.slug === 'alinex-gruntovka-alinex-primer')
  const primer2 = products.find((product) => product.slug === 'alinex-gruntovka-dlia-pola-alinex-primer-2')

  assert.equal(getProductTitle(primer, 'kg'), 'Курулуш астарлары (грунтовкасы) AlinEX PRIMER')
  assert.equal(getProductTitle(primer2, 'kg'), 'Курулуш астарлары (грунтовкасы) AlinEX PRIMER 2')
  assert.equal(getProductTitle(primer, 'ru'), 'Грунтовка AlinEX PRIMER')
})

test('AlinEX tile adhesive titles explain the Kyrgyz term with the familiar product name', () => {
  const tileAdhesives = products.filter((product) => (
    product.slug.startsWith('alinex-') && product.catalogPath?.at(-1) === 'plitka-kleileri'
  ))

  assert.equal(tileAdhesives.length, 5)
  assert.equal(
    tileAdhesives.every((product) => getProductTitle(product, 'kg').startsWith('Плитка желими (клейи) AlinEX ')),
    true,
  )
  assert.equal(
    getProductTitle(tileAdhesives.find((product) => product.sku === 'ALX-14'), 'kg'),
    'Плитка желими (клейи) AlinEX SET 308',
  )
})

test('Kyrgyz product variants translate supplier wording but preserve models', () => {
  const product = normalizeProduct({
    id: 'supplier-variants',
    titleKg: 'Техникалык товар',
    variants: [
      { id: 'mounting-box', titleKg: 'Karre Коробка наружного монтажа', titleRu: 'Karre Коробка наружного монтажа', price: 85 },
      { id: 'converter', titleKg: 'Частотный преобразователь NVF2G-2.2/TD2', titleRu: 'Частотный преобразователь NVF2G-2.2/TD2', price: 21740 },
      { id: 'color', titleKg: '110 мм, оранжевый', titleRu: '110 мм, оранжевый', price: 100 },
    ],
  })

  assert.deepEqual(
    product.variants.map((variant) => variant.titleKg),
    ['Karre Сырттан орнотулуучу куту', 'Жыштык өзгөрткүч NVF2G-2.2/TD2', '110 мм, кызгылт сары'],
  )
  assert.equal(product.variants[0].titleRu, 'Karre Коробка наружного монтажа')
})

test('unbranded cable-channel records stay recoverable but are not published', () => {
  assert.equal(products.find((item) => item.id === 'cable-channel-25x16'), undefined)
  assert.equal(products.find((item) => item.id === 'cable-channel-16x16'), undefined)
  assert.equal(resolveProductSlug('kabel-kanal-16x16'), 'kabel-kanal-25x16-2')
})
