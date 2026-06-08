import { useMemo, useState } from 'react'
import { applyImageFallback, getProductGallery, getProductImage, resolveImage } from '../../utils/imageUtils'

export function ProductGallery({ product, selectedVariant }) {
  const images = useMemo(() => getProductGallery(product, selectedVariant), [product, selectedVariant])
  const [activeImageSrc, setActiveImageSrc] = useState(null)
  const fallbackImage = getProductImage(product, selectedVariant)
  const activeImage =
    images.find((image) => resolveImage(image, fallbackImage).src === activeImageSrc) || images[0] || fallbackImage
  const active = resolveImage(activeImage, fallbackImage)

  return (
    <div className="product-gallery">
      <img
        className="product-gallery__main"
        src={active.src}
        alt={active.alt}
        width={active.width}
        height={active.height}
        data-fallback-src={active.fallbackSrc}
        onError={(event) => applyImageFallback(event, 'product')}
      />
      <div className="product-gallery__thumbs">
        {images.map((image, index) => {
          const resolved = resolveImage(image, getProductImage(product))
          const isActive = resolved.src === active.src

          return (
            <button
              className={isActive ? 'active' : ''}
              key={`${resolved.src}-${index}`}
              type="button"
              onClick={() => setActiveImageSrc(resolved.src)}
            >
              <img
                src={resolved.src}
                alt={resolved.alt}
                loading="lazy"
                width="180"
                height="180"
                data-fallback-src={resolved.fallbackSrc}
                onError={(event) => applyImageFallback(event, 'product')}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
