let bundledProductsPromise

export function loadBundledProducts() {
  if (!bundledProductsPromise) {
    bundledProductsPromise = import('../data/products.js').then(({ products }) => products)
  }

  return bundledProductsPromise
}
