export const rootCategoryImages = {
  stroymaterial: {
    src: '/images/categories/stroymaterial-realistic.jpg',
    alt: 'StroyRayon стройматериал категориясы',
    width: 800,
    height: 450,
    type: 'category',
  },
  instrument: {
    src: '/images/categories/instrument-realistic.jpg',
    alt: 'StroyRayon инструмент категориясы',
    width: 800,
    height: 450,
    type: 'category',
  },
  santehnika: {
    src: '/images/categories/santehnika.svg',
    alt: 'StroyRayon сантехника категориясы',
    width: 900,
    height: 520,
    type: 'category',
  },
  elektrika: {
    src: '/images/categories/elektrika.svg',
    alt: 'StroyRayon электрика категориясы',
    width: 900,
    height: 520,
    type: 'category',
  },
  ventilyaciya: {
    src: '/images/categories/ventilyaciya.svg',
    alt: 'StroyRayon вентиляция категориясы',
    width: 900,
    height: 520,
    type: 'category',
  },
  'boiok-tush-kagaz': {
    src: '/images/categories/boiok-tush-kagaz.svg',
    alt: 'StroyRayon боёк жана туш кагаз категориясы',
    width: 900,
    height: 520,
    type: 'category',
  },
  krepezh: {
    src: '/images/categories/krepezh.svg',
    alt: 'StroyRayon крепеж категориясы',
    width: 900,
    height: 520,
    type: 'category',
  },
  'bak-koroo': {
    src: '/images/categories/bak-koroo.svg',
    alt: 'StroyRayon бак короо категориясы',
    width: 900,
    height: 520,
    type: 'category',
  },
}

export function getRootCategoryImage(slug) {
  return rootCategoryImages[slug] || null
}
