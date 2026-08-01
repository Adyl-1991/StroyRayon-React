import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { normalizeKyrgyzText } from '../src/i18n/kyrgyzText.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultExtractPath = path.join(os.tmpdir(), 'stroyrayon-electrical-price-extract.json')
const extractPath = path.resolve(process.argv[2] || defaultExtractPath)
const outputPath = path.join(projectRoot, 'src', 'data', 'electricalSupplierProducts.generated.js')

const CATEGORY_META = {
  breakers: {
    labelKg: 'автоматтык өчүргүчтөр',
    labelRu: 'автоматические выключатели',
    catalogPath: ['elektrika', 'avtomatika-korgoo', 'avtomattar'],
    legacySubcategory: 'automation-protection',
  },
  rcd: {
    labelKg: 'УЗО',
    labelRu: 'УЗО',
    catalogPath: ['elektrika', 'avtomatika-korgoo', 'uzo'],
    legacySubcategory: 'automation-protection',
  },
  differential: {
    labelKg: 'дифференциалдык автоматтар',
    labelRu: 'дифференциальные автоматы',
    catalogPath: ['elektrika', 'avtomatika-korgoo', 'difavtomattar'],
    legacySubcategory: 'automation-protection',
  },
  contactors: {
    labelKg: 'контакторлор',
    labelRu: 'контакторы',
    catalogPath: ['elektrika', 'avtomatika-korgoo', 'kontaktory'],
    legacySubcategory: 'automation-protection',
  },
  relays: {
    labelKg: 'реле жана башкаруу аппараттары',
    labelRu: 'реле и аппараты управления',
    catalogPath: ['elektrika', 'avtomatika-korgoo', 'rele-kontrolya'],
    legacySubcategory: 'automation-protection',
  },
  starters: {
    labelKg: 'кыймылдаткычты ишке киргизгичтер',
    labelRu: 'пускатели и защита двигателя',
    catalogPath: ['elektrika', 'avtomatika-korgoo', 'puskateli-dvigatelya'],
    legacySubcategory: 'automation-protection',
  },
  ats: {
    labelKg: 'резервди автоматтык киргизүү',
    labelRu: 'автоматический ввод резерва',
    catalogPath: ['elektrika', 'avtomatika-korgoo', 'avtomaticheskii-vvod-rezerva'],
    legacySubcategory: 'automation-protection',
  },
  stabilizers: {
    labelKg: 'чыңалуу стабилизаторлору',
    labelRu: 'стабилизаторы напряжения',
    catalogPath: ['elektrika', 'avtomatika-korgoo', 'stabilizatory-napryazheniya'],
    legacySubcategory: 'automation-protection',
  },
  converters: {
    labelKg: 'жыштык өзгөрткүчтөр',
    labelRu: 'частотные преобразователи',
    catalogPath: ['elektrika', 'avtomatika-korgoo', 'chastotnye-preobrazovateli'],
    legacySubcategory: 'automation-protection',
  },
  transformers: {
    labelKg: 'трансформаторлор',
    labelRu: 'трансформаторы',
    catalogPath: ['elektrika', 'avtomatika-korgoo', 'transformatory'],
    legacySubcategory: 'automation-protection',
  },
  panels: {
    labelKg: 'монтаждык электр щиттери',
    labelRu: 'монтажные электрические щиты',
    catalogPath: ['elektrika', 'shitter'],
    legacySubcategory: 'electrical-panels',
  },
  accessories: {
    labelKg: 'электромонтаж аксессуарлары',
    labelRu: 'электромонтажные аксессуары',
    catalogPath: ['elektrika', 'elektromontazh-materialdary'],
    legacySubcategory: 'electrical-accessories',
  },
  sockets: {
    labelKg: 'розеткалар',
    labelRu: 'розетки',
    catalogPath: ['elektrika', 'rozetka-vyklyuchatel', 'rozetkalar'],
    legacySubcategory: 'switches-sockets',
  },
  switches: {
    labelKg: 'өчүргүчтөр жана которгучтар',
    labelRu: 'выключатели и переключатели',
    catalogPath: ['elektrika', 'rozetka-vyklyuchatel', 'vyklyuchatelder'],
    legacySubcategory: 'switches-sockets',
  },
  dimmers: {
    labelKg: 'жарык жөндөгүчтөр',
    labelRu: 'диммеры',
    catalogPath: ['elektrika', 'rozetka-vyklyuchatel', 'dimmery'],
    legacySubcategory: 'switches-sockets',
  },
  frames: {
    labelKg: 'розетка жана өчүргүч рамкалары',
    labelRu: 'рамки для розеток и выключателей',
    catalogPath: ['elektrika', 'rozetka-vyklyuchatel', 'ramki-rozetok-vyklyuchatelei'],
    legacySubcategory: 'switches-sockets',
  },
  mounting: {
    labelKg: 'монтаждык кутулар',
    labelRu: 'монтажные коробки',
    catalogPath: ['elektrika', 'rozetka-vyklyuchatel', 'montazhnye-korobki'],
    legacySubcategory: 'switches-sockets',
  },
}

function readExtract() {
  const source = fs.readFileSync(extractPath, 'utf8').replace(/^\uFEFF/, '')
  const workbooks = JSON.parse(source)
  if (!Array.isArray(workbooks)) throw new Error('Expected an array of extracted workbooks')
  return workbooks
}

function supplierFor(filePath) {
  if (/ЧИНТ/i.test(filePath)) return 'CHINT'
  if (/PANASONIC/i.test(filePath)) return 'PANASONIC'
  if (/ВИКО/i.test(filePath)) return 'VIKO'
  throw new Error(`Unknown supplier workbook: ${filePath}`)
}

function extractPricedItems(workbook) {
  const supplier = supplierFor(workbook.file)
  const items = []

  for (const row of workbook.rows || []) {
    for (const cell of row.cells || []) {
      if (cell.col !== 2 && cell.col !== 5) continue
      const priceCell = row.cells.find(
        (candidate) => candidate.col === cell.col + 1 && typeof candidate.value === 'number',
      )
      if (!priceCell || !String(cell.text || '').trim()) continue

      items.push({
        supplier,
        name: String(cell.text).replace(/\s+/g, ' ').trim(),
        wholesale: Number(priceCell.value),
        sourceRef: cell.address,
      })
    }
  }

  return items
}

function roundUp(value, step) {
  return Math.ceil((value - Number.EPSILON) / step) * step
}

function retailPrice(item) {
  if (item.supplier !== 'CHINT') return roundUp(item.wholesale * 1.12, 5)
  if (item.wholesale < 500) return roundUp(item.wholesale * 1.25, 5)
  if (item.wholesale < 5_000) return roundUp(item.wholesale * 1.2, 10)
  if (item.wholesale < 20_000) return roundUp(item.wholesale * 1.15, 10)
  return roundUp(item.wholesale * 1.1, 50)
}

function slugify(value) {
  const transliteration = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh',
    щ: 'shch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ь: '', ъ: '',
  }

  return String(value)
    .toLowerCase()
    .split('')
    .map((character) => transliteration[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeModelLabel(value) {
  return String(value || '')
    .replace(/[()[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstModel(name) {
  const match = name.match(
    /\b(?:NM1|NM8N|NXM|NXB|NXMS|NXH|NA1|NB1|NXBLE|NB2LE|NL-?\d+|NC1|NC2|NXC|NCH8|NR2|NXR|NS2|NQ3|NXZM|NJBK\d*|NJYB\d*|NJYW\d*|NTE8|NDK|NP\d+|ND9|JD5|JD8|XJ3|NZK1|KG316T|NVF2G|TND|TNSZ?|AC30)[-\w./]*/i,
  )
  return normalizeModelLabel(match?.[0]?.toUpperCase())
}

function chintCategory(name) {
  if (/щит\s+метал|монтажн.*щит/i.test(name)) return 'panels'
  if (/частотн.*преобраз|NVF2G/i.test(name)) return 'converters'
  if (/стабилизатор|\bTND\b|\bTNSZ?\b/i.test(name)) return 'stabilizers'
  if (/трансформатор|\bNDK\b/i.test(name)) return 'transformers'
  if (/автоматическ.*ввод.*резерв|\bNXZM\b/i.test(name)) return 'ats'
  if (/диф\.?\s*автомат|NXBLE|NB2LE/i.test(name)) return 'differential'
  if (/\b(?:NJBK\d*|NJYB\d*|NJYW\d*|NTE8|JD5|JD8|XJ3)\b/i.test(name)) return 'relays'
  if (/\bУЗО\b|\bNL-?\d+/i.test(name)) return 'rcd'
  if (/контактор|\bNC1\b|\bNC2\b|\bNXC\b|\bNCH8\b/i.test(name)) return 'contactors'
  if (/пускател|\bNS2\b|\bNQ3\b/i.test(name)) return 'starters'
  if (/реле|расцепител|доп\.?\s*контакт|сигнальн.*контакт|NJBK|NJYB|NJYW|NTE8|JD5|JD8|XJ3/i.test(name)) return 'relays'
  if (/автомат|\bNM1\b|\bNM8N\b|\bNXM\b|\bNXB\b|\bNA1\b|\bNB1\b/i.test(name)) return 'breakers'
  return 'accessories'
}

function chintGroupModel(item, category) {
  const name = item.name
  const model = firstModel(name)

  if (category === 'breakers') {
    const modularModel = name.match(/\b(NXB-\d+|NB1)\b/i)?.[1]?.toUpperCase()
    const poles = name.match(/\b([1-4])P\b/i)?.[1]
    if (modularModel) return `${modularModel}${poles ? ` ${poles}P` : ''}`
    if (/^NA1-/i.test(model)) return model.match(/^NA1-\d+/i)?.[0] || 'NA1'
    return model || 'СИЛОВЫЕ'
  }

  if (category === 'contactors') {
    return model?.match(/^(NC1|NC2|NXC|NCH8)/i)?.[1]?.toUpperCase() || 'КОНТАКТОРЫ'
  }

  if (category === 'relays') {
    return model?.match(/^(NR2|NXR|NJBK\d*|NJYB\d*|NJYW\d*|NTE8|JD5|JD8|XJ3)/i)?.[1]?.toUpperCase()
      || 'РЕЛЕ'
  }

  if (category === 'starters') return model?.match(/^(NS2|NQ3)/i)?.[1]?.toUpperCase() || 'ПУСКАТЕЛИ'
  if (category === 'ats') return 'NXZM'
  if (category === 'differential') return model?.match(/^(NXBLE-63Y|NXBLE-63|NB2LE)/i)?.[1]?.toUpperCase() || 'ДИФАВТОМАТЫ'
  if (category === 'rcd') {
    const rcdModel = model
      ?.match(/^NL-?\d+/i)?.[0]
      ?.toUpperCase()
      .replace(/^NL-/, 'NL1-')
    const poles = name.match(/\b([24])P\b/i)?.[1]

    if (rcdModel === 'NL1-63' && poles) return `${rcdModel} ${poles}P`
    return rcdModel || 'УЗО'
  }
  if (category === 'stabilizers') {
    if (/\bTNSZ\b/i.test(name)) return 'TNSZ 3Ф'
    if (/\bTNS\b/i.test(name)) return 'TNS 3Ф'
    return 'TND 1Ф'
  }
  if (category === 'converters') return 'NVF2G'
  if (category === 'transformers') return 'NDK'
  if (category === 'panels') return 'МЕТАЛЛИЧЕСКИЕ'

  return model?.match(/^[A-ZА-Я]+(?:\d+)?/i)?.[0]?.toUpperCase() || 'АКСЕССУАРЫ'
}

function fixtureCategory(name) {
  if (/реостат|диммер/i.test(name)) return 'dimmers'
  if (/рамка/i.test(name)) return 'frames'
  if (/коробка.*монтаж/i.test(name)) return 'mounting'
  if (/включатель|переключатель/i.test(name) && !/розетка\s*\+\s*включатель/i.test(name)) return 'switches'
  return 'sockets'
}

function vikoSeries(name) {
  return name.match(/\b(Carmen|Karre|Palmiye|Pacific)\b/i)?.[1]?.toUpperCase() || 'VIKO'
}

function classify(item) {
  if (item.supplier === 'CHINT') {
    const category = chintCategory(item.name)
    return { category, model: chintGroupModel(item, category) }
  }

  if (item.supplier === 'PANASONIC') {
    return { category: fixtureCategory(item.name), model: 'PANASONIC' }
  }

  if (/^Автомат\s+УЗО/i.test(item.name)) {
    const poles = item.name.match(/\b([24])х/i)?.[1] || ''
    return { category: 'rcd', model: poles ? `${poles}P` : '' }
  }
  if (/^Автомат/i.test(item.name)) {
    const poles = item.name.match(/\b([123])х/i)?.[1] || ''
    const series = /\bSbt\b/i.test(item.name) ? ' SBT' : ''
    return { category: 'breakers', model: `${series}${poles ? ` ${poles}P` : ''}`.trim() }
  }
  if (/^Контактор/i.test(item.name)) return { category: 'contactors', model: 'VIKO' }

  return { category: fixtureCategory(item.name), model: vikoSeries(item.name) }
}

function cleanVariantLabel(name) {
  return name
    .replace(/^["“]?CHIN[ТT]["”]?\s*/i, '')
    .replace(/^PANASONIC\s*/i, '')
    .replace(/\bNL-(63|100)\b/gi, 'NL1-$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function createGroups(items) {
  const groups = new Map()

  for (const item of items) {
    const { category, model } = classify(item)
    if (!CATEGORY_META[category]) throw new Error(`No category metadata for ${category}: ${item.name}`)

    const key = `${item.supplier}:${category}:${model}`
    if (!groups.has(key)) {
      groups.set(key, {
        supplier: item.supplier,
        category,
        model,
        items: [],
      })
    }
    groups.get(key).items.push(item)
  }

  return [...groups.values()]
}

function stableSkuToken(value) {
  let hash = 2166136261
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, '0')
}

function groupProduct(group) {
  const meta = CATEGORY_META[group.category]
  const redundantModel = (
    group.model === group.supplier
    || (group.category === 'rcd' && group.model === 'УЗО')
  )
  const modelSuffix = group.model && !redundantModel ? ` ${group.model}` : ''
  const id = slugify(`${group.supplier}-${group.category}-${group.model}`)
  const titleKg = `${group.supplier}${modelSuffix} — ${meta.labelKg}`
  const titleRu = `${meta.labelRu[0].toUpperCase()}${meta.labelRu.slice(1)} ${group.supplier}${modelSuffix}`
  const variants = group.items
    .map((item, index) => {
      const label = cleanVariantLabel(item.name)
      const titleKg = normalizeKyrgyzText(label)
      return {
        id: `${id}-${String(index + 1).padStart(3, '0')}`,
        size: titleKg,
        titleKg,
        titleRu: label,
        price: retailPrice(item),
        unit: 'даана',
        packageInfo: '1 даана',
        packageInfoRu: '1 штука',
        stockStatus: 'in_stock',
        sku: `${group.supplier}-APR26-${item.sourceRef}`,
        specs: {
          Бренд: group.supplier,
          Модель: titleKg,
          Бирдик: 'даана',
        },
        sortOrder: index + 1,
      }
    })
    .sort((left, right) => left.sortOrder - right.sortOrder)

  return {
    id,
    slug: id,
    sku: `${group.supplier}-APR26-G-${stableSkuToken(id)}`,
    titleKg,
    titleRu,
    categorySlug: 'electrics',
    subcategorySlug: meta.legacySubcategory,
    catalogPath: meta.catalogPath,
    price: Math.min(...variants.map((variant) => variant.price)),
    unit: 'даана',
    unitRu: 'шт',
    brand: group.supplier,
    stockStatus: 'in_stock',
    minOrder: '1 даана',
    minOrderRu: '1 штука',
    pack: '1 даана',
    packRu: '1 штука',
    productType: meta.labelKg,
    productTypeRu: meta.labelRu,
    shortDescriptionKg: `${group.supplier} маркасындагы ${meta.labelKg}. Керектүү моделди жана номиналды варианттардан тандаңыз.`,
    shortDescriptionRu: `${titleRu}. Выберите нужную модель и номинал в списке вариантов.`,
    fullDescriptionKg: `${group.supplier} маркасындагы ${meta.labelKg} электр монтажы үчүн. Карточкада 2026-жылдын апрель айындагы жеткирүүчүнүн баа тизмесинде баасы көрсөтүлгөн түрлөр гана жарыяланды. Туура номиналды, чыңалууну жана туташтыруу схемасын электрик менен тактаңыз.`,
    fullDescriptionRu: `${titleRu} для электромонтажных работ. В карточке опубликованы только варианты с указанной ценой из прайс-листа за апрель 2026 года. Номинал, напряжение и схему подключения рекомендуется согласовать с электриком.`,
    specificationsKg: {
      Бренд: group.supplier,
      Категория: meta.labelKg,
      Варианттар: String(variants.length),
      Кампада: 'Бар',
    },
    specificationsRu: {
      Бренд: group.supplier,
      Категория: meta.labelRu,
      Вариантов: String(variants.length),
      Наличие: 'В наличии',
    },
    aliases: group.items.map((item) => item.name),
    aliasesKg: [titleKg],
    aliasesRu: [titleRu, ...group.items.map((item) => item.name)],
    faqKg: [
      {
        question: 'Көрсөтүлгөн баа эмнеге тиешелүү?',
        answer: 'Баасы тандалган түрдүн бир даанасына көрсөтүлөт. Буйрутма берердин алдында керектүү номиналды жана чыңалууну текшериңиз.',
      },
      {
        question: 'Кайсы түрдү тандоо керек?',
        answer: 'Тандоо электр жүгүнө, полюстардын санына, тармак чыңалуусуна жана туташтыруу чиймесине жараша жүргүзүлөт. Так эсепти электрик менен макулдашыңыз.',
      },
    ],
    faqRu: [
      {
        question: 'За что указана цена?',
        answer: 'Цена указана за одну штуку выбранного варианта. Перед заказом проверьте нужный номинал и напряжение.',
      },
      {
        question: 'Как выбрать подходящий вариант?',
        answer: 'Выбор зависит от электрической нагрузки, количества полюсов, напряжения сети и схемы подключения. Точный расчёт рекомендуется согласовать с электриком.',
      },
    ],
    relatedProductIds: [],
    variants,
  }
}

function serializeModule(products, stats) {
  const json = JSON.stringify(products, null, 2)
  return `// Generated from the April 2026 supplier price lists by scripts/import-electrical-price-lists.mjs.
// Public prices are retail prices; supplier wholesale values are intentionally not emitted.

export const electricalSupplierImportStats = ${JSON.stringify(stats, null, 2)}

export const electricalSupplierProducts = ${json}
`
}

const workbooks = readExtract()
const items = workbooks.flatMap(extractPricedItems)
const groups = createGroups(items)
const products = groups
  .sort((left, right) =>
    left.supplier.localeCompare(right.supplier)
    || left.category.localeCompare(right.category)
    || left.model.localeCompare(right.model),
  )
  .map(groupProduct)

const stats = {
  source: 'supplier-price-lists-april-2026',
  sourceItems: items.length,
  productCards: products.length,
  variants: products.reduce((total, product) => total + product.variants.length, 0),
  bySupplier: Object.fromEntries(
    ['CHINT', 'PANASONIC', 'VIKO'].map((supplier) => {
      const supplierProducts = products.filter((product) => product.brand === supplier)
      return [
        supplier,
        {
          sourceItems: items.filter((item) => item.supplier === supplier).length,
          productCards: supplierProducts.length,
          variants: supplierProducts.reduce((total, product) => total + product.variants.length, 0),
        },
      ]
    }),
  ),
}

fs.writeFileSync(outputPath, serializeModule(products, stats), 'utf8')

console.log(`Generated ${path.relative(projectRoot, outputPath)}`)
console.log(JSON.stringify(stats, null, 2))
