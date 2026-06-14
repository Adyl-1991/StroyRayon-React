export const PRODUCT_REQUIRED_FIELDS = [
  'id',
  'slug',
  'sku',
  'titleKg',
  'titleRu',
  'catalogPath',
  'categoryId',
  'categorySlug',
  'subcategoryId',
  'subcategorySlug',
  'brand',
  'productType',
  'price',
  'currency',
  'unit',
  'stockStatus',
  'minOrder',
  'shortDescriptionKg',
  'shortDescriptionRu',
  'fullDescriptionKg',
  'fullDescriptionRu',
]

export const STOCK_STATUS_VALUES = ['in_stock', 'low_stock', 'pre_order', 'out_of_stock']

export const PRODUCT_UNIT_VALUES = ['даана', 'метр', 'комплект', 'кап', 'рулон']

export const PRODUCT_IMAGE_FORMAT = {
  src: 'string',
  alt: 'string',
  width: 'number',
  height: 'number',
  type: 'product | gallery | placeholder | external',
}

export const PRODUCT_DATA_GUIDE = {
  catalogPath: ['root-slug', 'section-slug', 'leaf-slug'],
  imageNaming: {
    main: '/images/products/{product-slug}/main.webp',
    gallery: '/images/products/{product-slug}/gallery-{index}.webp',
  },
  note: 'Бренд category болбойт. Бренд product.brand талаасында гана сакталат.',
}
