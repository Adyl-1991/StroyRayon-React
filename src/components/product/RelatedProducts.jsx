import { ProductGrid } from '../catalog/ProductGrid'

export function RelatedProducts({ products }) {
  return (
    <section className="page-section">
      <h2>Окшош товарлар</h2>
      <ProductGrid products={products} />
    </section>
  )
}
