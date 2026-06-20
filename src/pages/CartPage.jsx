import { CartItem } from '../components/cart/CartItem'
import { CartSummary } from '../components/cart/CartSummary'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { useCart } from '../hooks/useCart'
import { useLocale } from '../i18n/LocaleContext'

export function CartPage() {
  const { items, total, count, setQuantity, removeFromCart } = useCart()
  const { t } = useLocale()

  if (!items.length) {
    return (
      <main className="page page--cart">
        <Seo title={t('cart.title')} description={t('cart.seoDescription')} />
        <EmptyState title={t('cart.emptyTitle')} text={t('cart.emptyText')} />
      </main>
    )
  }

  return (
    <main className="page page--cart">
      <Seo title={t('cart.title')} description={t('cart.seoDescription')} />
      <Breadcrumbs items={[{ label: t('cart.title') }]} />
      <div className="page-heading">
        <h1>{t('cart.title')}</h1>
        <p>{t('cart.intro')}</p>
        <p className="microcopy">{t('product.priceDisclaimer')}</p>
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
