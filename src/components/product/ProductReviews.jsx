export function ProductReviews({ product }) {
  return (
    <section className="detail-panel">
      <h2>Кардарлардын пикири</h2>
      <p>
        Орточо баа {product.rating} / 5. Азырынча {product.reviewsCount} кардар бул товарды баалаган.
      </p>
      <p className="microcopy">Пикир модулу кийинки этапта аккаунт жана заказ тарыхы менен кошулат.</p>
    </section>
  )
}
