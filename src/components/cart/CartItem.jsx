import { Link } from 'react-router-dom'
import { formatPrice } from '../../utils/formatPrice'
import { applyImageFallback, resolveImage } from '../../utils/imageUtils'

export function CartItem({ item, setQuantity, removeFromCart }) {
  const cartItemId = item.cartItemId || item.productId
  const image = resolveImage(item.image, { alt: item.name, src: '/images/placeholders/product-placeholder.svg', width: 82, height: 82 })

  return (
    <article className="cart-item">
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        width="82"
        height="82"
        onError={(event) => applyImageFallback(event, 'product')}
      />
      <div>
        <h3>
          <Link to={`/product/${item.slug}`}>{item.name}</Link>
        </h3>
        {item.variantSize && (
          <p className="cart-item__variant">
            Өлчөм: {item.variantSize}
            {item.variantSku ? ` · SKU: ${item.variantSku}` : ''}
          </p>
        )}
        {item.packageInfo && <p className="cart-item__variant">Таңгак: {item.packageInfo}</p>}
        <p>
          {formatPrice(item.price)} / {item.unit}
        </p>
      </div>
      <div className="quantity-control" aria-label={`${item.name} саны`}>
        <button type="button" onClick={() => setQuantity(cartItemId, item.quantity - 1)}>
          -
        </button>
        <span>{item.quantity}</span>
        <button type="button" onClick={() => setQuantity(cartItemId, item.quantity + 1)}>
          +
        </button>
      </div>
      <strong>{formatPrice(item.price * item.quantity)}</strong>
      <button className="text-button" type="button" onClick={() => removeFromCart(cartItemId)}>
        Өчүрүү
      </button>
    </article>
  )
}
