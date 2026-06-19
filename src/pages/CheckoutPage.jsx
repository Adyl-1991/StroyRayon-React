import { useMemo, useState } from 'react'
import { createOrder } from '../api/ordersApi'
import { USE_API } from '../config/api'
import { CartSummary } from '../components/cart/CartSummary'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useCart } from '../hooks/useCart'
import { buildWhatsAppOrderText, getWhatsAppUrl, shortPriceStockDisclaimer } from '../services/whatsappService'

export function CheckoutPage() {
  const { items, total, count } = useCart()
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    comment: '',
  })
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)

  const orderText = useMemo(() => buildWhatsAppOrderText({ customer, items, total }), [customer, items, total])
  const fallbackWhatsappUrl = useMemo(() => getWhatsAppUrl(orderText), [orderText])
  const errors = {
    name: customer.name.trim() ? '' : 'Атыңызды жазыңыз',
    phone: customer.phone.trim() ? '' : 'Телефон номериңизди жазыңыз',
    address: customer.address.trim() ? '' : 'Дарек же регионду жазыңыз',
  }
  const isReady = !errors.name && !errors.phone && !errors.address && items.length && !isSubmitting
  const visibleErrors = {
    name: touched.name ? errors.name : '',
    phone: touched.phone ? errors.phone : '',
    address: touched.address ? errors.address : '',
  }

  function updateField(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }))
    setConfirmation(null)
  }

  function markTouched(field) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  function buildOrderPayload() {
    return {
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
      },
      items: items.map((item) => ({
        productId: item.productId,
        slug: item.slug,
        title: item.name,
        sku: item.sku,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        unit: item.unit,
      })),
      comment: customer.comment.trim() || undefined,
      source: 'website',
    }
  }

  function openWhatsApp(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setTouched({ name: true, phone: true, address: true })
    if (!isReady && !isSubmitting) return

    if (!USE_API) {
      setConfirmation({ whatsappUrl: fallbackWhatsappUrl })
      openWhatsApp(fallbackWhatsappUrl)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await createOrder(buildOrderPayload())
      const whatsappUrl = response?.whatsappUrl || fallbackWhatsappUrl
      setConfirmation({
        orderNumber: response?.orderNumber,
        whatsappUrl,
        whatsappText: response?.whatsappText,
      })
      openWhatsApp(whatsappUrl)
    } catch (error) {
      console.warn('Order API unavailable, falling back to local WhatsApp checkout.', error)
      setConfirmation({
        whatsappUrl: fallbackWhatsappUrl,
        fallback: true,
      })
      openWhatsApp(fallbackWhatsappUrl)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!items.length) {
    return (
      <main className="page page--checkout">
        <Seo title="Заказ берүү" description="StroyRayon барагында товарларды тандап, заказды WhatsApp аркылуу менеджерге жөнөтүңүз." />
        <EmptyState title="Заказ берүү үчүн товар жок" text="Адегенде себетке керектүү товарларды кошуңуз." />
      </main>
    )
  }

  return (
    <main className="page page--checkout">
      <Seo title="Заказ берүү" description="StroyRayon барагында товарларды тандап, заказды WhatsApp аркылуу менеджерге жөнөтүңүз." />
      <Breadcrumbs items={[{ label: 'Себет', to: '/cart' }, { label: 'Заказ берүү' }]} />
      <div className="page-heading">
        <h1>Заказ берүү</h1>
        <p>Байланыш маалыматыңызды жазыңыз. Товарлар жана жеткирүү шарттары менеджер менен WhatsApp аркылуу такталат.</p>
        <p className="microcopy">{shortPriceStockDisclaimer}</p>
      </div>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <h2>Байланыш маалыматы</h2>
          <label>
            Аты-жөнү
            <input
              value={customer.name}
              onChange={(event) => updateField('name', event.target.value)}
              onBlur={() => markTouched('name')}
              aria-describedby="checkout-name-error"
              aria-invalid={Boolean(visibleErrors.name)}
              required
            />
            {visibleErrors.name && (
              <span className="form-error" id="checkout-name-error" role="alert">
                {visibleErrors.name}
              </span>
            )}
          </label>
          <label>
            Телефон
            <input
              value={customer.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              onBlur={() => markTouched('phone')}
              aria-describedby="checkout-phone-error"
              aria-invalid={Boolean(visibleErrors.phone)}
              required
            />
            {visibleErrors.phone && (
              <span className="form-error" id="checkout-phone-error" role="alert">
                {visibleErrors.phone}
              </span>
            )}
          </label>
          <h2>Жеткирүү дареги</h2>
          <label>
            Дарек/регион
            <input
              value={customer.address}
              onChange={(event) => updateField('address', event.target.value)}
              onBlur={() => markTouched('address')}
              aria-describedby="checkout-address-error"
              aria-invalid={Boolean(visibleErrors.address)}
              required
            />
            {visibleErrors.address && (
              <span className="form-error" id="checkout-address-error" role="alert">
                {visibleErrors.address}
              </span>
            )}
          </label>
          <label>
            Комментарий
            <textarea
              rows="4"
              value={customer.comment}
              onChange={(event) => updateField('comment', event.target.value)}
              placeholder="Мисалы: жеткирүү убактысы, кабат, кошумча товар"
            />
          </label>
          {confirmation && (
            <div className="checkout-success" role="status">
              <strong>Заказ даярдалды</strong>
              {confirmation.orderNumber && <span>Заказ номери: {confirmation.orderNumber}</span>}
              <span>WhatsApp аркылуу менеджерге жөнөтүңүз.</span>
              {confirmation.fallback && <span>Backend жеткиликсиз болгондуктан WhatsApp fallback колдонулду.</span>}
            </div>
          )}
          <div className="order-preview">
            <h2>Заказдын курамы</h2>
            <pre>{confirmation?.whatsappText || orderText}</pre>
          </div>
          <Button type="submit" variant="whatsapp" disabled={!isReady}>
            {isSubmitting ? 'Жөнөтүлүүдө...' : 'WhatsApp аркылуу заказ жөнөтүү'}
          </Button>
          {confirmation?.whatsappUrl && (
            <Button href={confirmation.whatsappUrl} target="_blank" rel="noreferrer" variant="secondary">
              WhatsApp шилтемесин кайра ачуу
            </Button>
          )}
        </form>
        <CartSummary total={total} count={count} checkout={false} />
      </div>
    </main>
  )
}
