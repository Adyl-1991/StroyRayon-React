const CABLE_UNIT = 'метр'

function cableVariant({ cores, section, price, sortOrder }) {
  const sectionSlug = String(section).replace('.', '-')
  const size = `${cores}×${String(section).replace('.', ',')} мм²`

  return {
    id: `carkit-pvs-${cores}x${sectionSlug}`,
    size,
    titleKg: size,
    titleRu: size,
    price,
    unit: CABLE_UNIT,
    packageInfo: '1 метр',
    packageInfoRu: '1 метр',
    stockStatus: 'in_stock',
    sku: `CK-PVS-${cores}X${String(section).replace('.', '')}`,
    specs: {
      'Маркасы': 'ПВС',
      'Жилалардын саны': String(cores),
      'Кесилиши': `${String(section).replace('.', ',')} мм²`,
      'Сатуу бирдиги': CABLE_UNIT,
    },
    sortOrder,
  }
}

const sectionsByCores = {
  2: [
    [0.75, 45.75],
    [1.5, 73.25],
    [2.5, 105.7],
    [4, 159.6],
    [6, 225.6],
  ],
  3: [
    [0.75, 60.6],
    [1.5, 94.7],
    [2.5, 145.3],
    [4, 222.85],
    [6, 320.2],
  ],
}

function variantsFor(cores) {
  return sectionsByCores[cores].map(([section, price], index) =>
    cableVariant({ cores, section, price, sortOrder: index + 1 }),
  )
}

function carkitPvsProduct({ cores, id, slug, sku }) {
  const variants = variantsFor(cores)
  const coreLabelKg = `${cores} жилалуу`
  const coreLabelRu = `${cores}-жильный`

  return {
    id,
    slug,
    sku,
    titleKg: `CARKIT ПВС ${coreLabelKg} зым`,
    titleRu: `Провод ПВС CARKIT, ${coreLabelRu}`,
    categorySlug: 'electrics',
    subcategorySlug: 'cables',
    catalogPath: ['elektrika', 'kabel-provod', 'pvs-provod'],
    price: variants[0].price,
    unit: CABLE_UNIT,
    unitRu: 'м',
    brand: 'CARKIT',
    stockStatus: 'in_stock',
    imageStatus: 'ready-generated',
    isPlaceholderImage: false,
    minOrder: '1 метр',
    minOrderRu: '1 метр',
    pack: 'метр менен кесилип берилет',
    packRu: 'отрезается по метражу',
    productType: 'Ийкемдүү ПВС зымы',
    productTypeRu: 'Гибкий провод ПВС',
    shortDescriptionKg: `CARKIT маркасындагы ${coreLabelKg} ийкемдүү ПВС зымы. Керектүү кесилишти тандап, метр менен сатып алууга болот.`,
    shortDescriptionRu: `${coreLabelRu[0].toUpperCase()}${coreLabelRu.slice(1)} гибкий провод ПВС CARKIT. Выберите нужное сечение; товар продается по метрам.`,
    fullDescriptionKg: `CARKIT маркасындагы ${coreLabelKg} ПВС зымы тиричилик электр жабдыктарын, узарткычтарды жана ийкемдүү туташтырууларды даярдоого ылайыктуу. Карточкадан керектүү кесилишти тандаңыз. Баа бир метр үчүн көрсөтүлгөн, зым керектүү узундукта кесилип берилет. Жүктү, кесилишти жана туташтыруу ыкмасын электрик менен тактоо сунушталат.`,
    fullDescriptionRu: `${coreLabelRu[0].toUpperCase()}${coreLabelRu.slice(1)} провод ПВС CARKIT подходит для изготовления удлинителей, подключения бытового электрооборудования и других задач, где нужна гибкость. Выберите требуемое сечение в карточке. Цена указана за один метр, провод отрезается по нужной длине. Нагрузку, сечение и способ подключения рекомендуется согласовать с электриком.`,
    specificationsKg: {
      'Бренд': 'CARKIT',
      'Маркасы': 'ПВС',
      'Жилалардын саны': String(cores),
      'Кесилиштер': '0,75; 1,5; 2,5; 4; 6 мм²',
      'Сатуу бирдиги': CABLE_UNIT,
      'Буюртманын эң азы': '1 метр',
    },
    specificationsRu: {
      'Бренд': 'CARKIT',
      'Марка': 'ПВС',
      'Количество жил': String(cores),
      'Сечения': '0,75; 1,5; 2,5; 4; 6 мм²',
      'Единица продажи': 'метр',
      'Минимальный заказ': '1 метр',
    },
    aliases: [`CARKIT ПВС ${cores} жилы`, `ПВС ${cores}х`, `провод ПВС CARKIT`],
    aliasesKg: [`CARKIT ПВС ${cores} жилалуу`, `${cores} жилалуу ПВС зым`],
    aliasesRu: [`ПВС CARKIT ${cores} жилы`, `${coreLabelRu} провод ПВС`],
    faqKg: [
      {
        question: 'Баа кайсы өлчөм үчүн көрсөтүлгөн?',
        answer: 'Карточкадагы баа тандалган кесилиштеги зымдын бир метри үчүн көрсөтүлөт.',
      },
      {
        question: 'Канча метрден сатып алса болот?',
        answer: 'Эң аз өлчөм — 1 метр. Керектүү узундукту товарды тандаганда көрсөтсөңүз болот.',
      },
      {
        question: 'Кайсы кесилишти тандоо керек?',
        answer: 'Кесилиш электр жүгүнө, линиянын узундугуна жана колдонуу шартына жараша тандалат. Так эсепти электрик менен текшериңиз.',
      },
    ],
    faqRu: [
      {
        question: 'За какую длину указана цена?',
        answer: 'Цена в карточке указана за один метр провода выбранного сечения.',
      },
      {
        question: 'От какого количества можно купить?',
        answer: 'Минимальный заказ — 1 метр. Нужную длину можно указать при выборе товара.',
      },
      {
        question: 'Как выбрать сечение?',
        answer: 'Сечение выбирают по электрической нагрузке, длине линии и условиям эксплуатации. Расчет рекомендуется проверить с электриком.',
      },
    ],
    seoTitleKg: `CARKIT ПВС ${coreLabelKg} зым — метр менен сатып алуу | StroyRayon`,
    seoTitleRu: `Провод ПВС CARKIT, ${coreLabelRu} — цена за метр | StroyRayon`,
    seoDescriptionKg: `CARKIT ${coreLabelKg} ПВС зымы: 0,75–6 мм² кесилиштер, метр менен сатылат, кампада бар.`,
    seoDescriptionRu: `Провод ПВС CARKIT, ${coreLabelRu}: сечения 0,75–6 мм², продажа по метрам, товар в наличии.`,
    relatedProductIds: cores === 2
      ? ['pvs-provod-3x1-5', 'electrical-tape-black', 'wago-terminal-3']
      : ['carkit-pvs-2-zhilnyi', 'electrical-tape-black', 'wago-terminal-3'],
    variants,
  }
}

export const carkitCableProducts = [
  carkitPvsProduct({
    cores: 2,
    id: 'carkit-pvs-2-zhilnyi',
    slug: 'carkit-pvs-2-zhilnyi',
    sku: 'CK-PVS-2C',
  }),
  carkitPvsProduct({
    cores: 3,
    id: 'pvs-provod-3x1-5',
    slug: 'pvs-provod-3x1-5',
    sku: 'CK-PVS-3C',
  }),
]
