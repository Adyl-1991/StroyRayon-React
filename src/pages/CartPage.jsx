import { CartItem } from '../components/cart/CartItem'
import { CartSummary } from '../components/cart/CartSummary'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { useCart } from '../hooks/useCart'

export function CartPage() {
  const { items, total, count, setQuantity, removeFromCart } = useCart()

  if (!items.length) {
    return (
      <>
        <Seo title="Себет" description="StroyRayon себетинде товарлардын санын жана жалпы сумманы тактап, WhatsApp аркылуу заказ бериңиз." />
        <EmptyState title="Себет бош" text="Керектүү товарларды каталогдон кошуп баштаңыз." />
      </>
    )
  }

  return (
    <main className="page">
      <Seo title="Себет" description="StroyRayon себетинде товарлардын санын жана жалпы сумманы тактап, WhatsApp аркылуу заказ бериңиз." />
      <Breadcrumbs items={[{ label: 'Себет' }]} />
      <div className="page-heading">
        <h1>Себет</h1>
        <p>Санын тактап, заказ берүү барагы аркылуу WhatsAppка даяр билдирүү жөнөтүңүз.</p>
      </div>
      <div className="cart-layout">
        <section className="cart-list">
          {items.map((item) => (
            <CartItem key={item.cartItemId || item.productId} item={item} setQuantity={setQuantity} removeFromCart={removeFromCart} />
          ))}
        </section>
        <CartSummary total={total} count={count} />
      </div>
    </main>
  )
}
