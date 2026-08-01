import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDefaultVariant,
  getFilteredProducts,
  getLocalizedUnitText,
  getProductListField,
  getProductTitle,
  getProductPrice,
  getProductSpecs,
  getSelectedVariant,
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

test('white 2 m cable channel exposes all existing sizes as variants', () => {
  const product = products.find((item) => item.id === 'cable-channel-25x16')
  const oldProduct = products.find((item) => item.id === 'cable-channel-16x16')

  assert.ok(product)
  assert.equal(product.slug, 'kabel-kanal-25x16-2')
  assert.equal(product.sku, 'SR-ELC-CHN-WHT-2M')
  assert.equal(product.brand, null)
  assert.equal(product.price, 38)
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
  assert.equal(getProductSpecs(product, 'ru').Размеры, '29 типоразмеров')
  assert.equal(getProductSpecs(product, 'ru')['Размеры под заказ'], undefined)
  assert.equal(product.variants.length, 29)
  assert.deepEqual(
    product.variants.slice(0, 2).map((variant) => [variant.size, variant.titleRu, variant.sku, variant.price, variant.specs.Цвет]),
    [
      ['16x16 мм', '16x16 мм, 2 м, белый', 'SR-ELC-CHN-1616-2M', 38, 'белый'],
      ['25x16 мм', '25x16 мм, 2 м, белый', 'SR-ELC-CHN-2516-2M', 59.97, 'белый'],
    ],
  )
  assert.equal(product.variants.filter((variant) => variant.price === 0).length, 27)
  assert.equal(product.variants.filter((variant) => variant.stockStatus === 'out_of_stock').length, 27)
  assert.ok(product.variants.every((variant) => variant.sku && variant.specs.Цвет === 'белый'))
  assert.equal(getProductPrice(product), 38)
  assert.equal(getDefaultVariant(product).id, 'cable-channel-white-2m-16x16')
  assert.equal(getSelectedVariant(product, 'cable-channel-white-2m-25x16').price, 59.97)
  assert.equal(oldProduct.isActive, false)
  assert.deepEqual(getFilteredProducts({}, [oldProduct, product]).map((item) => item.id), ['cable-channel-25x16'])
  assert.equal(resolveProductSlug('kabel-kanal-16x16'), 'kabel-kanal-25x16-2')
})
