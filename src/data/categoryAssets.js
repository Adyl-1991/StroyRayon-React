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
    src: '/images/categories/santehnika-realistic.jpg',
    alt: 'StroyRayon сантехника категориясы',
    width: 800,
    height: 450,
    type: 'category',
  },
  elektrika: {
    src: '/images/categories/elektrika-realistic.jpg',
    alt: 'StroyRayon электрика категориясы',
    width: 800,
    height: 450,
    type: 'category',
  },
  ventilyaciya: {
    src: '/images/categories/ventilyaciya-realistic.jpg',
    alt: 'StroyRayon вентиляция категориясы',
    width: 800,
    height: 450,
    type: 'category',
  },
  'boiok-tush-kagaz': {
    src: '/images/categories/boiok-tush-kagaz-realistic.jpg',
    alt: 'StroyRayon боёк жана туш кагаз категориясы',
    width: 800,
    height: 450,
    type: 'category',
  },
  krepezh: {
    src: '/images/categories/krepezh-realistic.jpg',
    alt: 'StroyRayon крепеж категориясы',
    width: 800,
    height: 450,
    type: 'category',
  },
  'bak-koroo': {
    src: '/images/categories/bak-koroo-realistic.jpg',
    alt: 'StroyRayon бак короо категориясы',
    width: 800,
    height: 450,
    type: 'category',
  },
}

export function getRootCategoryImage(slug) {
  return rootCategoryImages[slug] || null
}
