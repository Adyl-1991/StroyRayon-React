export function buildCheckoutOrderPayload({ customer, items, locale = 'kg' }) {
  return {
    customer: {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
    },
    items: items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      slug: item.slug,
      title: locale === 'ru' ? item.titleRu || item.name : item.titleKg || item.name,
      sku: item.variantSku || item.sku,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      unit: item.unit,
    })),
    comment: customer.comment.trim() || undefined,
    source: 'website',
    locale,
  }
}
