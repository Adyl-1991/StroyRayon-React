import { useState } from 'react'
import { applyImageFallback, getProductGallery, getProductImage, resolveImage } from '../../utils/imageUtils'

export function ProductGallery({ product }) {
  const images = getProductGallery(product)
  const [activeImage, setActiveImage] = useState(images[0])
  const active = resolveImage(activeImage, getProductImage(product))

  return (
    <div className="product-gallery">
      <img
        className="product-gallery__main"
        src={active.src}
        alt={active.alt}
        width={active.width}
        height={active.height}
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
              onClick={() => setActiveImage(image)}
            >
              <img
                src={resolved.src}
                alt={resolved.alt}
                loading="lazy"
                width="180"
                height="180"
                onError={(event) => applyImageFallback(event, 'product')}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
