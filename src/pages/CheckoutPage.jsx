import { useMemo, useState } from 'react'
import { createOrder } from '../api/ordersApi'
import { USE_API } from '../config/api'
import { CartSummary } from '../components/cart/CartSummary'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useCart } from '../hooks/useCart'
import { useLocale } from '../i18n/LocaleContext'
import { buildWhatsAppOrderText, getWhatsAppUrl } from '../services/whatsappService'

export function CheckoutPage() {
  const { items, total, count } = useCart()
  const { locale, t } = useLocale()
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    comment: '',
  })
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)

  const orderText = useMemo(() => buildWhatsAppOrderText({ customer, items, total, locale }), [customer, items, locale, total])
  const fallbackWhatsappUrl = useMemo(() => getWhatsAppUrl(orderText), [orderText])
  const errors = {
    name: customer.name.trim() ? '' : t('checkout.nameError'),
    phone: customer.phone.trim() ? '' : t('checkout.phoneError'),
    address: customer.address.trim() ? '' : t('checkout.addressError'),
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
        title: locale === 'ru' ? item.titleRu || item.name : item.titleKg || item.name,
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
        <Seo title={t('checkout.title')} description={t('checkout.seoDescription')} />
        <EmptyState title={t('checkout.emptyTitle')} text={t('checkout.emptyText')} />
      </main>
    )
  }

  return (
    <main className="page page--checkout">
      <Seo title={t('checkout.title')} description={t('checkout.seoDescription')} />
      <Breadcrumbs items={[{ label: t('cart.title'), to: '/cart' }, { label: t('checkout.title') }]} />
      <div className="page-heading">
        <h1>{t('checkout.title')}</h1>
        <p>{t('checkout.intro')}</p>
        <p className="microcopy">{t('product.priceDisclaimer')}</p>
      </div>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <h2>{t('checkout.contactTitle')}</h2>
          <label>
            {t('checkout.name')}
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
            {t('checkout.phone')}
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
          <h2>{t('checkout.addressTitle')}</h2>
          <label>
            {t('checkout.address')}
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
            {t('checkout.comment')}
            <textarea
              rows="4"
              value={customer.comment}
              onChange={(event) => updateField('comment', event.target.value)}
              placeholder={t('checkout.commentPlaceholder')}
            />
          </label>
          {confirmation && (
            <div className="checkout-success" role="status">
              <strong>{t('checkout.ready')}</strong>
              {confirmation.orderNumber && <span>{t('checkout.orderNumber', { number: confirmation.orderNumber })}</span>}
              <span>{t('checkout.sendManager')}</span>
              {confirmation.fallback && <span>{t('checkout.fallback')}</span>}
            </div>
          )}
          <div className="order-preview">
            <h2>{t('checkout.preview')}</h2>
            <pre>{confirmation?.whatsappText || orderText}</pre>
          </div>
          <Button type="submit" variant="whatsapp" disabled={!isReady}>
            {isSubmitting ? t('checkout.submitting') : t('checkout.submit')}
          </Button>
          {confirmation?.whatsappUrl && (
            <Button href={confirmation.whatsappUrl} target="_blank" rel="noreferrer" variant="secondary">
              {t('checkout.reopen')}
            </Button>
          )}
        </form>
        <CartSummary total={total} count={count} checkout={false} />
      </div>
    </main>
  )
}
