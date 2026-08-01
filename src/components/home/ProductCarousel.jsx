import { useCallback, useEffect, useRef, useState } from 'react'
import { ProductCard } from '../catalog/ProductCard'
import { useLocale } from '../../i18n/LocaleContext'

const AUTOPLAY_DELAY_MS = 5200

function getCarouselLabels(locale) {
  if (locale === 'ru') {
    return {
      label: 'Карусель популярных товаров',
      previous: 'Показать предыдущий товар',
      next: 'Показать следующий товар',
      pause: 'Остановить автопрокрутку',
      play: 'Включить автопрокрутку',
    }
  }

  return {
    label: 'Көп тандалган товарлар карусели',
    previous: 'Мурунку товарды көрсөтүү',
    next: 'Кийинки товарды көрсөтүү',
    pause: 'Автоматтык жылдырууну токтотуу',
    play: 'Автоматтык жылдырууну иштетүү',
  }
}

export function ProductCarousel({ products = [] }) {
  const { locale } = useLocale()
  const viewportRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isInteracting, setIsInteracting] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const labels = getCarouselLabels(locale)
  const canMove = products.length > 1

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)

    updatePreference()
    mediaQuery.addEventListener?.('change', updatePreference)
    return () => mediaQuery.removeEventListener?.('change', updatePreference)
  }, [])

  const move = useCallback((direction) => {
    const viewport = viewportRef.current
    const firstItem = viewport?.querySelector('.product-carousel__item')

    if (!viewport || !firstItem) return

    const gap = Number.parseFloat(window.getComputedStyle(viewport).columnGap) || 0
    const step = firstItem.getBoundingClientRect().width + gap
    const maxScroll = Math.max(viewport.scrollWidth - viewport.clientWidth, 0)
    const nextScroll = direction > 0
      ? (viewport.scrollLeft >= maxScroll - 4 ? 0 : Math.min(viewport.scrollLeft + step, maxScroll))
      : (viewport.scrollLeft <= 4 ? maxScroll : Math.max(viewport.scrollLeft - step, 0))

    viewport.scrollTo({
      left: nextScroll,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }, [prefersReducedMotion])

  const moveManually = (direction) => {
    setIsPlaying(false)
    move(direction)
  }

  useEffect(() => {
    if (!canMove || !isPlaying || isInteracting || prefersReducedMotion) return undefined

    const intervalId = window.setInterval(() => move(1), AUTOPLAY_DELAY_MS)
    return () => window.clearInterval(intervalId)
  }, [canMove, isInteracting, isPlaying, move, prefersReducedMotion])

  if (!products.length) return null

  return (
    <div
      className="product-carousel"
      role="region"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocusCapture={() => setIsInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsInteracting(false)
      }}
      aria-label={labels.label}
    >
      {canMove && (
        <div className="product-carousel__controls" role="group" aria-label={labels.label}>
          <button type="button" onClick={() => moveManually(-1)} aria-label={labels.previous}>
            <span aria-hidden="true">‹</span>
          </button>
          {!prefersReducedMotion && (
            <button
              type="button"
              className="product-carousel__playback"
              onClick={() => setIsPlaying((current) => !current)}
              aria-label={isPlaying ? labels.pause : labels.play}
              aria-pressed={!isPlaying}
            >
              <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '▶'}</span>
            </button>
          )}
          <button type="button" onClick={() => moveManually(1)} aria-label={labels.next}>
            <span aria-hidden="true">›</span>
          </button>
        </div>
      )}

      <div
        className="product-carousel__viewport"
        ref={viewportRef}
        onPointerDown={() => setIsInteracting(true)}
        onPointerUp={() => setIsInteracting(false)}
        onPointerCancel={() => setIsInteracting(false)}
        tabIndex="0"
      >
        {products.map((product) => (
          <div className="product-carousel__item" key={product.id}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  )
}
