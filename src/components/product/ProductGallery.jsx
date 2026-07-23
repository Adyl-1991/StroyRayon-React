import { useMemo, useState } from 'react'
import {
  applyImageFallback,
  getOptimizedProductImage,
  getProductGallery,
  getProductImage,
  resolveImage,
} from '../../utils/imageUtils'
import { useLocale } from '../../i18n/LocaleContext'
import { getProductTitle, normalizeKgText } from '../../services/productService'

export function ProductGallery({ product, selectedVariant }) {
  const { locale } = useLocale()
  const images = useMemo(() => getProductGallery(product, selectedVariant), [product, selectedVariant])
  const [activeImageSrc, setActiveImageSrc] = useState(null)
  const fallbackImage = getProductImage(product, selectedVariant)
  const activeImage =
    images.find((image) => resolveImage(image, fallbackImage).src === activeImageSrc) || images[0] || fallbackImage
  const activeSource = resolveImage(activeImage, fallbackImage)
  const active = getOptimizedProductImage(activeSource, 'detail')
  const productName = getProductTitle(product, locale)
  const localizeAlt = (alt) => locale === 'ru' ? productName : normalizeKgText(alt || productName)

  return (
    <div className="product-gallery">
      <img
        className="product-gallery__main"
        src={active.src}
        srcSet={active.srcSet || undefined}
        sizes={active.sizes || undefined}
        alt={localizeAlt(active.alt)}
        decoding="async"
        fetchPriority="high"
        width={active.width}
        height={active.height}
        data-fallback-src={active.fallbackSrc}
        data-placeholder-src={active.placeholderSrc}
        onError={(event) => applyImageFallback(event, 'product')}
      />
      {images.length > 1 && (
        <div className="product-gallery__thumbs">
          {images.map((image, index) => {
            const resolved = resolveImage(image, getProductImage(product))
            const displayImage = getOptimizedProductImage(resolved, 'thumb')
            const isActive = resolved.src === activeSource.src

            return (
              <button
                className={isActive ? 'active' : ''}
                key={`${resolved.src}-${index}`}
                type="button"
                onClick={() => setActiveImageSrc(resolved.src)}
              >
                <img
                  src={displayImage.src}
                  srcSet={displayImage.srcSet || undefined}
                  sizes={displayImage.sizes || undefined}
                  alt={localizeAlt(displayImage.alt)}
                  loading="lazy"
                  decoding="async"
                  width="180"
                  height="180"
                  data-fallback-src={displayImage.fallbackSrc}
                  data-placeholder-src={displayImage.placeholderSrc}
                  onError={(event) => applyImageFallback(event, 'product')}
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
