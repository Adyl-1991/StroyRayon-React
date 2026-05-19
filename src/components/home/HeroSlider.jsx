import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { heroSlides } from '../../data/heroSlides'
import { useLocale } from '../../i18n/LocaleContext'

const AUTOPLAY_DELAY = 5000

export function HeroSlider() {
  const { locale, t } = useLocale()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) return undefined

    const timerId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroSlides.length)
    }, AUTOPLAY_DELAY)

    return () => window.clearInterval(timerId)
  }, [isPaused])

  function goToSlide(index) {
    setActiveIndex((index + heroSlides.length) % heroSlides.length)
  }

  return (
    <section
      className="promo-slider"
      aria-roledescription="carousel"
      aria-label={t('hero.label')}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="promo-slider__viewport">
        <div className="promo-slider__track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {heroSlides.map((slide, index) => (
            <article
              className={`promo-slide promo-slide--${slide.theme}`}
              key={slide.id}
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${heroSlides.length}`}
              aria-hidden={index !== activeIndex}
            >
              <img
                className="promo-slide__image"
                src={slide.image}
                alt=""
                width="1400"
                height="520"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              <div className="promo-slide__shade" aria-hidden="true" />
              <div className="promo-slide__content">
                <span className="promo-slide__kicker">{t('hero.kicker')}</span>
                <h1>{slide.title[locale]}</h1>
                <p>{slide.text[locale]}</p>
                <Link className="button promo-slide__button" to={slide.ctaTo}>
                  {slide.ctaLabel[locale]}
                </Link>
              </div>
            </article>
          ))}
        </div>
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
            aria-label={`${index + 1}-слайд`}
            aria-current={index === activeIndex ? 'true' : undefined}
          />
        ))}
      </div>
    </section>
  )
}
