import { useState } from 'react'
import { Link } from 'react-router-dom'
import { heroSlides } from '../../data/heroSlides'
import { useLocale } from '../../i18n/LocaleContext'
import { normalizeKyrgyzText } from '../../i18n/kyrgyzText'

export function HeroSlider() {
  const { locale, t } = useLocale()
  const [activeIndex, setActiveIndex] = useState(0)

  function goToSlide(index) {
    setActiveIndex((index + heroSlides.length) % heroSlides.length)
  }

  const activeSlide = heroSlides[activeIndex]
  const slideText = (value) => locale === 'kg' ? normalizeKyrgyzText(value) : value
  const responsiveSizes = '(max-width: 760px) calc(100vw - 20px), min(calc(100vw - 32px), 1180px)'

  return (
    <section
      className="promo-slider"
      aria-roledescription="carousel"
      aria-label={t('hero.label')}
    >
      <div className="promo-slider__viewport" aria-live="polite">
        <article
          className={`promo-slide promo-slide--${activeSlide.theme}`}
          key={activeSlide.id}
          aria-roledescription="slide"
          aria-label={`${activeIndex + 1} / ${heroSlides.length}`}
        >
          <picture className="promo-slide__picture">
            <source
              type="image/avif"
              srcSet={`${activeSlide.imageBase}-768.avif 768w, ${activeSlide.imageBase}-1600.avif 1600w`}
              sizes={responsiveSizes}
            />
            <source
              type="image/webp"
              srcSet={`${activeSlide.imageBase}-768.webp 768w, ${activeSlide.imageBase}-1600.webp 1600w`}
              sizes={responsiveSizes}
            />
              <img
                className="promo-slide__image"
                src={`${activeSlide.imageBase}-1600.webp`}
                srcSet={`${activeSlide.imageBase}-768.webp 768w, ${activeSlide.imageBase}-1600.webp 1600w`}
                sizes={responsiveSizes}
                alt=""
                width="1600"
                height="901"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
          </picture>
          <div className="promo-slide__shade" aria-hidden="true" />
          <div className="promo-slide__content">
            <span className="promo-slide__kicker">{t('hero.kicker')}</span>
            <h1>{slideText(activeSlide.title[locale])}</h1>
            <p>{slideText(activeSlide.text[locale])}</p>
            <Link className="button promo-slide__button" to={activeSlide.ctaTo}>
              {slideText(activeSlide.ctaLabel[locale])}
            </Link>
          </div>
        </article>
      </div>

      <button
        className="promo-slider__control promo-slider__control--prev"
        type="button"
        onClick={() => goToSlide(activeIndex - 1)}
        aria-label={t('hero.previous')}
      >
        ‹
      </button>
      <button
        className="promo-slider__control promo-slider__control--next"
        type="button"
        onClick={() => goToSlide(activeIndex + 1)}
        aria-label={t('hero.next')}
      >
        ›
      </button>

      <div className="promo-slider__dots" aria-label={t('hero.dots')}>
        {heroSlides.map((slide, index) => (
          <button
            className={index === activeIndex ? 'active' : ''}
            key={slide.id}
            type="button"
            onClick={() => goToSlide(index)}
            aria-label={t('hero.slide', { number: index + 1 })}
            aria-current={index === activeIndex ? 'true' : undefined}
          />
        ))}
      </div>
    </section>
  )
}
