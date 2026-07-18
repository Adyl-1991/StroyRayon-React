import { useEffect, useState } from 'react'
import { useCart } from '../../hooks/useCart'
import { useLocale } from '../../i18n/LocaleContext'
import { getProductTitle, getUnitLabel, isPurchasable } from '../../services/productService'
import { buildProductInquiryText, getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { Button } from '../ui/Button'

export function ProductStickyCta({ product, selectedVariant }) {
  const { addToCart } = useCart()
  const { locale, t } = useLocale()
  const [isVisible, setIsVisible] = useState(false)
  const canBuy = isPurchasable(product, selectedVariant)
  const activePrice = selectedVariant?.price ?? product.price
  const hasActivePrice = Number(activePrice) > 0
  const activeUnit = getUnitLabel(selectedVariant?.unit || product.unit, locale)
  const productName = getProductTitle(product, locale)
  const activeName = selectedVariant ? `${productName} (${selectedVariant.size})` : productName
  const askText = buildProductInquiryText({ product: { ...product, name: productName }, variant: selectedVariant, locale })

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 200)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <aside className={`product-sticky-cta${isVisible ? ' is-visible' : ''}`} aria-label={t('product.stickyLabel')}>
      <div className="product-sticky-cta__info">
        <strong>
          {hasActivePrice ? `${formatPrice(activePrice)} / ${activeUnit}` : t('product.priceNotSet')}
        </strong>
        <span>{activeName}</span>
        <small>{t('product.stickyDisclaimer')}</small>
      </div>
      <div className={`product-sticky-cta__actions${hasActivePrice ? '' : ' product-sticky-cta__actions--inquiry'}`}>
        {hasActivePrice && (
          <Button disabled={!canBuy} onClick={() => addToCart(product, 1, selectedVariant)}>
            {t('product.stickyCart')}
          </Button>
        )}
        <Button href={getWhatsAppUrl(askText)} target="_blank" rel="noreferrer" variant="whatsapp">
          {hasActivePrice ? 'WhatsApp' : t('product.stickyAskPrice')}
        </Button>
      </div>
    </aside>
  )
}
