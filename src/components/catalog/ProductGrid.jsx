import { ProductCard } from './ProductCard'
import { EmptyState } from '../ui/EmptyState'

export function ProductGrid({ products }) {
  if (!products.length) {
    return (
      <EmptyState
        title="Товар табылган жок"
        text="Бул фильтр боюнча товар табылган жок. Фильтрди тазалап көрүңүз же менеджерге WhatsApp аркылуу жазыңыз."
        actionText="Бардык каталог"
      />
    )
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
