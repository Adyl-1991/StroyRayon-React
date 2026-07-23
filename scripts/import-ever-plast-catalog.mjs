import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import sharp from 'sharp'

const EVER_BASE = 'https://ever58.ru'
const XML_URL = `${EVER_BASE}/ever58_ru_catalog.xml`
const CSV_URL = `${EVER_BASE}/ever58_ru_products.csv`
const PRICE_DATE = '2026-05-30'
const MARKUP = 0.2
const OUTPUT_FILE = path.resolve('src/data/everPlastProducts.generated.js')
const PUBLIC_REPORT_DIR = path.resolve('reports/ever-plast-import')
const PRIVATE_REPORT_DIR = path.resolve('reports/ever-plast-import-private')
const IMAGE_ROOT = path.resolve('public/images/products')
const desktopDir = process.env.EVER_PLAST_PRICE_DIR || path.join(os.homedir(), 'Desktop')

const PPR_ROOT = ['inzhenerdik-santehnika', 'ppr-trubalar-fitingder']
const SEWER_ROOT = ['inzhenerdik-santehnika', 'kanalizaciya']

const familyConfigs = {
  'ppr-pipe-pn20': family('ППР түтүк PN20 SDR 6 EVER PLAST', 'ППР труба PN20 SDR 6 EVER PLAST', [...PPR_ROOT, 'ppr-trubalar', 'ppr-truba-pn20'], 'метр', 'PPR түтүк', 'ППР труба'),
  'ppr-pipe-fiber': family('Стекловолокно катмарлуу ППР түтүк PN25 EVER PLAST', 'ППР труба FIBER PN25 EVER PLAST', [...PPR_ROOT, 'ppr-trubalar', 'armirlengen-ppr-trubalar'], 'метр', 'Армирленген ППР түтүк', 'Армированная ППР труба'),
  'ppr-pipe-dual': family('Алюминий менен армирленген ППР түтүк DUAL PN25 EVER PLAST', 'ППР труба DUAL PN25 с алюминием EVER PLAST', [...PPR_ROOT, 'ppr-trubalar', 'armirlengen-ppr-trubalar'], 'метр', 'Армирленген ППР түтүк', 'Армированная ППР труба'),
  'ppr-elbow-90': family('ППР бурчтук 90° EVER PLAST', 'ППР уголок 90° EVER PLAST', [...PPR_ROOT, 'ppr-ugoloktor']),
  'ppr-elbow-45': family('ППР бурчтук 45° EVER PLAST', 'ППР уголок 45° EVER PLAST', [...PPR_ROOT, 'ppr-ugoloktor']),
  'ppr-clip': family('ППР түтүк үчүн клипса EVER PLAST', 'Клипса для ППР трубы EVER PLAST', [...PPR_ROOT, 'ppr-klipsy-krepleniya']),
  'ppr-tee': family('ППР тройник EVER PLAST', 'ППР тройник EVER PLAST', [...PPR_ROOT, 'ppr-troynikter']),
  'ppr-plug': family('ППР заглушка EVER PLAST', 'ППР заглушка EVER PLAST', [...PPR_ROOT, 'ppr-muftalar']),
  'ppr-cross': family('ППР крестовина EVER PLAST', 'ППР крестовина EVER PLAST', [...PPR_ROOT, 'ppr-muftalar']),
  'ppr-coupling': family('ППР бириктиргич муфта EVER PLAST', 'ППР муфта соединительная EVER PLAST', [...PPR_ROOT, 'ppr-muftalar']),
  'ppr-bypass': family('ППР раструбдуу обвод EVER PLAST', 'ППР обвод раструбный EVER PLAST', [...PPR_ROOT, 'ppr-muftalar']),
  'ppr-reducer': family('ППР өткөөл муфта EVER PLAST', 'ППР муфта переходная EVER PLAST', [...PPR_ROOT, 'ppr-perehodnikter']),
  'ppr-reducing-tee': family('ППР өткөөл тройник EVER PLAST', 'ППР тройник переходной EVER PLAST', [...PPR_ROOT, 'ppr-troynikter']),
  'ppr-combined-tee-vr': family('ППР комбинирленген тройник ВР EVER PLAST', 'ППР тройник комбинированный ВР EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-combined-tee-nr': family('ППР комбинирленген тройник НР EVER PLAST', 'ППР тройник комбинированный НР EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-combined-elbow-vr': family('ППР комбинирленген бурчтук ВР EVER PLAST', 'ППР уголок комбинированный ВР EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-combined-elbow-nr': family('ППР комбинирленген бурчтук НР EVER PLAST', 'ППР уголок комбинированный НР EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-wall-elbow-vr': family('ППР дубалдык бурчтук ВР EVER PLAST', 'ППР уголок ВР с креплением EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-wall-elbow-nr': family('ППР дубалдык бурчтук НР EVER PLAST', 'ППР уголок НР с креплением EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-double-wall-elbow-vr': family('ППР кош дубалдык бурчтук ВР EVER PLAST', 'ППР уголок ВР с двойным креплением EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-double-wall-elbow-nr': family('ППР кош дубалдык бурчтук НР EVER PLAST', 'ППР уголок НР с двойным креплением EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-combined-coupling-vr': family('ППР комбинирленген муфта ВР EVER PLAST', 'ППР муфта комбинированная ВР EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-combined-coupling-nr': family('ППР комбинирленген муфта НР EVER PLAST', 'ППР муфта комбинированная НР EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-union-vr': family('ППР ажыратылма муфта ВР EVER PLAST', 'ППР муфта разъёмная ВР EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-union-nr': family('ППР ажыратылма муфта НР EVER PLAST', 'ППР муфта разъёмная НР EVER PLAST', [...PPR_ROOT, 'kombinirovannye-fitingder']),
  'ppr-filter': family('ППР кыйгач фильтр EVER PLAST', 'ППР фильтр косой EVER PLAST', [...PPR_ROOT, 'ppr-krandar']),
  'ppr-valve': family('ППР толук өтмө шар кран EVER PLAST', 'ППР шаровой полнопроходной кран EVER PLAST', [...PPR_ROOT, 'ppr-krandar']),
  'sewer-coupling': family('Канализация муфтасы EVER PLAST', 'Канализационная муфта EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya']),
  'sewer-elbow-45': family('Ички канализация отводу 45° EVER PLAST', 'Отвод внутренней канализации 45° EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya', 'kanalizaciya-ugoloktor']),
  'sewer-elbow-90': family('Ички канализация отводу 90° EVER PLAST', 'Отвод внутренней канализации 90° EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya', 'kanalizaciya-ugoloktor']),
  'sewer-special-elbow': family('Канализация багытталган отводу EVER PLAST', 'Канализационный ориентированный отвод EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya', 'kanalizaciya-ugoloktor']),
  'sewer-plug': family('Канализация заглушкасы EVER PLAST', 'Канализационная заглушка EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya']),
  'sewer-revision': family('Канализация ревизиясы EVER PLAST', 'Канализационная ревизия EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya']),
  'sewer-reducer': family('Канализация өткөөлү EVER PLAST', 'Канализационный переход EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya']),
  'sewer-tee-90': family('Ички канализация тройниги 90° EVER PLAST', 'Тройник внутренней канализации 90° EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya', 'kanalizaciya-troynikter']),
  'sewer-tee-45': family('Ички канализация тройниги 45° EVER PLAST', 'Тройник внутренней канализации 45° EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya', 'kanalizaciya-troynikter']),
  'sewer-cross': family('Канализация крестовинасы EVER PLAST', 'Канализационная крестовина EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya']),
  'sewer-spigot': family('Канализация патрубогу EVER PLAST', 'Канализационный патрубок EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya']),
  'sewer-clip': family('Канализация түтүгү үчүн крепление', 'Крепление для канализационной трубы', SEWER_ROOT),
  'sewer-metal-clamp': family('Сантехникалык металл хомут', 'Сантехнический металлический хомут', SEWER_ROOT),
  'sewer-pipe-50-internal': family('Ички канализация түтүгү 50 мм EVER PLAST', 'Труба внутренней канализации 50 мм EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya', 'kanalizaciya-trubalary-50']),
  'sewer-pipe-110-internal': family('Ички канализация түтүгү 110 мм EVER PLAST', 'Труба внутренней канализации 110 мм EVER PLAST', [...SEWER_ROOT, 'ichki-kanalizaciya', 'kanalizaciya-trubalary-110']),
  'sewer-pipe-110-external': family('Сырткы канализация түтүгү 110 мм EVER PLAST', 'Труба наружной канализации 110 мм EVER PLAST', [...SEWER_ROOT, 'syrtky-kanalizaciya']),
  'sewer-pipe-160-external': family('Сырткы канализация түтүгү 160 мм EVER PLAST', 'Труба наружной канализации 160 мм EVER PLAST', [...SEWER_ROOT, 'syrtky-kanalizaciya']),
  'sewer-external-elbow-45': family('Сырткы канализация отводу 45° EVER PLAST', 'Отвод наружной канализации 45° EVER PLAST', [...SEWER_ROOT, 'syrtky-kanalizaciya']),
  'sewer-external-elbow-90': family('Сырткы канализация отводу 90° EVER PLAST', 'Отвод наружной канализации 90° EVER PLAST', [...SEWER_ROOT, 'syrtky-kanalizaciya']),
  'sewer-external-revision': family('Сырткы канализация ревизиясы EVER PLAST', 'Ревизия наружной канализации EVER PLAST', [...SEWER_ROOT, 'syrtky-kanalizaciya']),
  'sewer-external-tee-45': family('Сырткы канализация тройниги 45° EVER PLAST', 'Тройник наружной канализации 45° EVER PLAST', [...SEWER_ROOT, 'syrtky-kanalizaciya']),
  'sewer-external-tee-90': family('Сырткы канализация тройниги 90° EVER PLAST', 'Тройник наружной канализации 90° EVER PLAST', [...SEWER_ROOT, 'syrtky-kanalizaciya']),
}

const generatedSewerAssetByFamily = {
  'sewer-coupling': 'couplings.webp',
  'sewer-elbow-45': 'elbows.webp',
  'sewer-elbow-90': 'elbows.webp',
  'sewer-external-elbow-45': 'elbows.webp',
  'sewer-external-elbow-90': 'elbows.webp',
  'sewer-special-elbow': 'directional-fittings.webp',
  'sewer-tee-45': 'tees-crosses.webp',
  'sewer-tee-90': 'tees-crosses.webp',
  'sewer-external-tee-45': 'tees-crosses.webp',
  'sewer-external-tee-90': 'tees-crosses.webp',
  'sewer-cross': 'tees-crosses.webp',
  'sewer-plug': 'service-fittings.webp',
  'sewer-revision': 'service-fittings.webp',
  'sewer-reducer': 'service-fittings.webp',
  'sewer-spigot': 'service-fittings.webp',
  'sewer-external-revision': 'service-fittings-orange.webp',
  'sewer-clip': 'clamps.webp',
  'sewer-metal-clamp': 'clamps.webp',
  'sewer-pipe-50-internal': 'pipes-gray.webp',
  'sewer-pipe-110-internal': 'pipes-gray.webp',
  'sewer-pipe-110-external': 'pipes-orange.webp',
  'sewer-pipe-160-external': 'pipes-orange.webp',
}

function family(titleKg, titleRu, catalogPath, unit = 'даана', productType = 'ППР бириктиргич', productTypeRu = 'ППР фитинг') {
  return { titleKg, titleRu, catalogPath, unit, productType, productTypeRu }
}

export function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;quot;|&quot;|&#34;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value) {
  const translit = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sh', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ь: '', ъ: '' }
  return String(value).toLocaleLowerCase('ru').split('').map((char) => translit[char] ?? char).join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalize(value = '') {
  return decodeHtml(value)
    .toLocaleLowerCase('ru')
    .replace(/×/g, 'x')
    .replace(/(\d)\s*х\s*(\d)/g, '$1x$2')
    .replace(/[“”«»]/g, '"')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeSku(value = '') {
  return decodeHtml(value).toUpperCase().replace(/[^A-ZА-Я0-9]/g, '')
}

export function roundRetail(cost) {
  return Math.ceil(Number(cost) * (1 + MARKUP))
}

function cleanPriceName(value = '') {
  return decodeHtml(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\bбел(?:ый|\.)?\b/gi, ' ')
    .replace(/\bсер(?:ый|\.)?\b/gi, ' ')
    .replace(/\bрыж(?:ий)?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function variantSignature(name, familyKey) {
  const cleaned = normalize(cleanPriceName(name))
    .replace(/\b(?:pn|sdr)\s*\d+(?:[.,]\d+)?\b/g, ' ')
    .replace(/\b(?:45|90|87[.,]5)\s*(?:градус(?:ов|а)?|°|\*)/g, ' ')

  if (familyKey.includes('sewer-pipe')) {
    const diameter = cleaned.match(/\b(50|110|160)\b/)?.[1]
    const length = cleaned.match(/(\d+(?:[.,]\d+)?)\s*м(?:\s|$)/)?.[1]?.replace(',', '.')
    const wall = cleaned.match(/толщ[^\d]*(\d+(?:[.,]\d+)?)/)?.[1]?.replace(',', '.')
    return [diameter, length, wall].filter(Boolean).join('x')
  }

  if (familyKey === 'sewer-spigot') {
    const diameter = cleaned.match(/\b(50|110|160)\b/)?.[1]
    const length = cleaned.match(/(\d+(?:[.,]\d+)?)\s*м(?:\s|$)/)?.[1]?.replace(',', '.')
    return [diameter, length].filter(Boolean).join('x')
  }

  if (familyKey === 'sewer-clip') return cleaned.match(/\b(50|110|160)\b/)?.[1] || ''

  if (familyKey === 'sewer-metal-clamp') {
    return cleaned.match(/\b(\d+(?:\s+\d+\/\d+|\/\d+)?)\s*"/)?.[1]?.replace(/\s+/g, ' ') || ''
  }

  const dimension = cleaned.match(/\d+(?:[.,]\d+)?(?:\s*x\s*\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\/\d+)?){1,3}/)?.[0]
  if (dimension) return dimension.replace(/\s*x\s*/g, 'x').replace(/\s*\/\s*/g, '/').replace(/,/g, '.')

  const matches = cleaned.match(/\d+(?:[.,]\d+)?(?:\s*\/\s*\d+){0,3}/g) || []
  const useful = matches.map((item) => item.replace(/\s+/g, '').replace(/,/g, '.'))
    .filter((item) => !familyKey.includes('elbow') || !['45', '90', '87.5'].includes(item))

  if (familyKey.startsWith('ppr-pipe')) {
    const pipe = cleaned.match(/труба\s+(\d+)\s*x\s*(\d+(?:[.,]\d+)?)/)
    if (pipe) return `${pipe[1]}x${pipe[2].replace(',', '.')}`
  }

  return useful.sort((a, b) => b.length - a.length)[0] || ''
}

function variantLabel(row, familyKey) {
  const signature = variantSignature(row.name, familyKey)
  if (!signature) return cleanPriceName(row.name)
  const normalizedName = normalize(row.name)

  if (familyKey.includes('sewer-pipe')) {
    const [diameter, length] = signature.split('x')
    return `${diameter} мм × ${String(length).replace('.', ',')} м`
  }

  if (familyKey === 'sewer-spigot') {
    const [diameter, length] = signature.split('x')
    return length ? `${diameter} мм × ${length.replace('.', ',')} м` : `${diameter} мм`
  }

  if (familyKey === 'sewer-metal-clamp') return `${signature}\"`
  if (familyKey === 'sewer-clip') return `${signature} мм`

  if (familyKey === 'sewer-special-elbow' || familyKey === 'sewer-cross') {
    return cleanPriceName(row.name)
      .replace(/^(?:ПВХ\s+)?(?:Отвод|Крестовина)\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  if (familyKey === 'sewer-coupling' || familyKey === 'sewer-plug') {
    return `${signature} мм, ${/рыж/i.test(row.name) ? 'оранжевый' : 'серый'}`
  }

  if (familyKey === 'sewer-reducer') {
    return `${signature}, ${/коротк/i.test(normalizedName) ? 'короткий' : 'стандартный'}`
  }

  if (familyKey.startsWith('ppr-pipe')) return `${signature.split('x')[0]} мм`

  if (/combined|union|wall-elbow/.test(familyKey)) {
    const parts = signature.split('x')
    if (familyKey.includes('combined-tee') && parts.length === 2) parts.push(parts[0])
    return parts.map((part, index) => index === 1 ? `${part.replace('.', ',')}″` : `${part.replace('.', ',')} мм`).join(' × ')
  }

  const formatted = signature.replace(/x/g, '×').replace(/\./g, ',')
  return `${formatted} мм`
}

function isSectionLine(line) {
  if (/\|\s*ед\.изм\.\s*\|/i.test(line)) return true
  return /^(Холодные трубы|Горячие трубы|Алюми\. Трубы|Теплые полы|Подложка для теплого пола|Фитинги для трубы|Канализационные Фитинги)$/i.test(line.trim())
}

function sectionName(line) {
  return decodeHtml(line.split('|')[0])
}

export function parsePriceLines(lines, source) {
  const rows = []
  let section = ''
  let pending = []

  const addRow = (name, unit, cost, raw) => {
    if (/^(?:штук|шт\.?|метр)$/i.test(decodeHtml(name))) {
      pending = []
      return
    }
    const normalizedUnit = /метр/i.test(unit) ? 'метр' : 'даана'
    rows.push({ source, section, name: decodeHtml(name), unit: normalizedUnit, purchasePrice: Number(cost), retailPrice: roundRetail(cost), raw })
    pending = []
  }

  for (const rawLine of lines) {
    const line = decodeHtml(rawLine)
    if (!line || /^===== PAGE/.test(line) || /^(Адрес|тел\.)/i.test(line)) continue
    if (isSectionLine(line)) {
      section = sectionName(line)
      pending = []
      continue
    }

    let match = line.match(/^(.*?)\s*\|\s*(штук|шт|метр)\s*\|\s*(\d+)\s*$/i)
    if (match) {
      let name = match[1]
      if (pending.length && (/^(\(|шпильк|и\s|со\s)/i.test(name) || /\b(?:со|с|и)$/i.test(pending.at(-1)))) name = `${pending.join(' ')} ${name}`
      addRow(name, match[2], match[3], line)
      continue
    }

    match = line.match(/^(штук|шт|метр)\s*\|\s*(\d+)\s*$/i)
    if (match && pending.length) {
      addRow(pending.join(' '), match[1], match[2], line)
      continue
    }

    match = line.match(/^(.*?)\s*\|\s*(\d+)\s*$/)
    if (match && !/ед\.изм/i.test(match[1])) {
      const name = match[1] || pending.join(' ')
      addRow(name, source === 'ppr' && /^Труба/i.test(name) ? 'метр' : 'штук', match[2], line)
      continue
    }

    if (!/^штук|шт|метр$/i.test(line)) {
      pending.push(line)
      if (pending.length > 2) pending.shift()
    }
  }

  return rows.filter((row) => Number.isFinite(row.purchasePrice) && row.purchasePrice > 0 && row.name)
}

async function extractPdfLines(filePath) {
  const bytes = new Uint8Array(await readFile(filePath))
  const document = await getDocument({ data: bytes, useSystemFonts: true }).promise
  const lines = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const rows = []

    for (const item of content.items) {
      const value = String(item.str || '').trim()
      if (!value) continue
      const x = Number(item.transform?.[4] || 0)
      const y = Number(item.transform?.[5] || 0)
      let row = rows.find((candidate) => Math.abs(candidate.y - y) < 2)
      if (!row) {
        row = { y, cells: [] }
        rows.push(row)
      }
      row.cells.push({ x, value })
    }

    lines.push(`===== PAGE ${pageNumber} =====`)
    lines.push(...rows.sort((a, b) => b.y - a.y).map((row) => row.cells.sort((a, b) => a.x - b.x).map((cell) => cell.value).join(' | ')))
  }

  return { lines, pages: document.numPages }
}

function parseXmlCatalog(xml) {
  const categories = new Map()
  for (const match of xml.matchAll(/<category\s+id=['"]([^'"]+)['"](?:\s+parentId=['"]([^'"]+)['"])?>([\s\S]*?)<\/category>/g)) {
    categories.set(match[1], { id: match[1], parentId: match[2] || '', name: decodeHtml(match[3].replace(/<[^>]+>/g, ' ')) })
  }

  const products = []
  for (const match of xml.matchAll(/<product\s+id=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/product>/g)) {
    const body = match[2]
    const value = (tag) => decodeHtml(body.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] || '')
    products.push({
      sku: match[1],
      name: value('name'),
      url: value('url'),
      picture: value('picture'),
      categoryId: value('categoryId'),
    })
  }

  return { categories, products }
}

function parseCsvCatalog(csvText) {
  const map = new Map()
  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).slice(1)

  for (const line of lines) {
    if (!line.trim()) continue
    const fields = line.split(';')
    const sku = normalizeSku(fields[0])
    if (!sku) continue
    const characteristics = fields.slice(7).join(';')
    const get = (label) => decodeHtml(characteristics.match(new RegExp(`${label}:([^,]+)`, 'i'))?.[1] || '')
    map.set(sku, {
      material: get('Материал'),
      pressure: get('Номинальное давление,?\\s*PN'),
      workingTemperature: get('Рабочая температура'),
      maxTemperature: get('Максимальная рабочая температура'),
      connectionDiameter: get('Диаметр присоединения'),
      warranty: get('Гарантия'),
      color: get('Цвет'),
    })
  }

  return map
}

function pprThreadKey(name, vrKey, nrKey) {
  return /НР|HP|наружн/i.test(name) ? nrKey : /ВР|внутрен/i.test(name) ? vrKey : ''
}

export function classifyPriceRow(row) {
  const name = decodeHtml(row.name)
  const section = normalize(row.section)
  const normalizedName = normalize(name)

  if (row.source === 'ppr') {
    if (/тепл|подлож|бак расшир|шланг/.test(section) || /\bVRT\b/i.test(name)) return ''
    if (/холодные трубы/.test(section)) return 'ppr-pipe-pn20'
    if (/горячие трубы/.test(section)) return 'ppr-pipe-fiber'
    if (/алюми/.test(section)) return 'ppr-pipe-dual'
    if (/угол 90/.test(section)) return 'ppr-elbow-90'
    if (/угол 45/.test(section)) return 'ppr-elbow-45'
    if (/крепление/.test(section) && !/уголок/.test(section)) return 'ppr-clip'
    if (/тройник комб/.test(section)) return pprThreadKey(name, 'ppr-combined-tee-vr', 'ppr-combined-tee-nr')
    if (/тройник переход/.test(section)) return 'ppr-reducing-tee'
    if (/^тройник$/.test(section)) return 'ppr-tee'
    if (/заглушка/.test(section)) return 'ppr-plug'
    if (/крестовина/.test(section)) return 'ppr-cross'
    if (/^муфта$/.test(section)) return 'ppr-coupling'
    if (/обвод/.test(section)) return 'ppr-bypass'
    if (/муфта переход/.test(section)) return 'ppr-reducer'
    if (/угольник комб/.test(section)) return pprThreadKey(name, 'ppr-combined-elbow-vr', 'ppr-combined-elbow-nr')
    if (/двойным креплением/.test(section)) return pprThreadKey(name, 'ppr-double-wall-elbow-vr', 'ppr-double-wall-elbow-nr')
    if (/уголок с креплением/.test(section)) return pprThreadKey(name, 'ppr-wall-elbow-vr', 'ppr-wall-elbow-nr')
    if (/муфта комбинированный с разъем/.test(section)) return pprThreadKey(name, 'ppr-union-vr', 'ppr-union-nr')
    if (/муфта комбинированный/.test(section)) return pprThreadKey(name, 'ppr-combined-coupling-vr', 'ppr-combined-coupling-nr')
    if (/фильтры/.test(section)) return 'ppr-filter'
    if (/краны шаровые/.test(section)) return 'ppr-valve'
    return ''
  }

  if (/хомут сантехнический/.test(normalizedName)) return 'sewer-metal-clamp'
  if (/^крестовина/.test(normalizedName)) return 'sewer-cross'
  if (/^отвод 110\/50/.test(normalizedName)) return 'sewer-special-elbow'
  if (/муфта/.test(section)) return 'sewer-coupling'
  if (/отвод 45.*оранж/.test(section)) return 'sewer-external-elbow-45'
  if (/отвод 90.*оранж/.test(section)) return 'sewer-external-elbow-90'
  if (/отвод 45/.test(section)) return /(?:\s|^)90(?:\*|°|\s|$)/.test(normalizedName) ? 'sewer-elbow-90' : 'sewer-elbow-45'
  if (/отвод 90/.test(section)) return 'sewer-elbow-90'
  if (/заглушка/.test(section)) return 'sewer-plug'
  if (/ревизия.*оранж/.test(section)) return 'sewer-external-revision'
  if (/ревизия/.test(section)) return 'sewer-revision'
  if (/переход/.test(section)) return 'sewer-reducer'
  if (/тройник 45.*оранж/.test(section)) return 'sewer-external-tee-45'
  if (/тройник 90.*оранж/.test(section)) return 'sewer-external-tee-90'
  if (/тройник 45/.test(section)) return 'sewer-tee-45'
  if (/тройник 90/.test(section)) return 'sewer-tee-90'
  if (/патрубки/.test(section)) return 'sewer-spigot'
  if (/канализационные крепление/.test(section)) return 'sewer-clip'
  if (/металлические хомуты/.test(section)) return 'sewer-metal-clamp'
  if (/трубы ф-50/.test(section)) return 'sewer-pipe-50-internal'
  if (/трубы ф-110 серые/.test(section)) return 'sewer-pipe-110-internal'
  if (/трубы ф-110 оранжевые/.test(section)) return 'sewer-pipe-110-external'
  if (/трубы ф-160 оранжевые/.test(section)) return 'sewer-pipe-160-external'
  return ''
}

function classifyOfficialProduct(product) {
  const id = String(product.categoryId)
  const name = normalize(product.name)
  if (['36', '37', '38', '44'].includes(id)) {
    if (/алюмин|dual/.test(name)) return 'ppr-pipe-dual'
    if (/стекловолок|fiber/.test(name)) return /pn\s*25|sdr\s*6/.test(name) ? 'ppr-pipe-fiber' : 'ppr-pipe-fiber'
    return 'ppr-pipe-pn20'
  }
  const byCategory = {
    7: 'ppr-coupling', 8: 'ppr-reducer', 9: 'ppr-reducer', 10: 'ppr-tee', 11: 'ppr-reducing-tee', 12: 'ppr-bypass', 14: 'ppr-cross', 15: 'ppr-elbow-45', 16: 'ppr-elbow-90', 17: 'ppr-plug',
    18: 'ppr-combined-elbow-vr', 19: 'ppr-combined-elbow-nr', 20: 'ppr-combined-coupling-vr', 21: 'ppr-combined-coupling-nr', 22: 'ppr-combined-tee-vr', 23: 'ppr-wall-elbow-vr', 24: 'ppr-wall-elbow-nr', 25: 'ppr-double-wall-elbow-vr', 26: 'ppr-double-wall-elbow-nr', 27: 'ppr-valve', 30: 'ppr-filter', 31: 'ppr-filter', 32: 'ppr-union-vr', 33: 'ppr-union-nr', 34: 'ppr-combined-tee-nr', 39: 'ppr-clip', 40: 'ppr-combined-coupling-vr', 41: 'ppr-combined-coupling-nr',
  }
  if (byCategory[id]) return byCategory[id]
  if (['46', '47', '48', '45'].includes(id) && /\b110\b/.test(name)) return 'sewer-pipe-110-internal'
  if (['46', '47', '48', '45'].includes(id) && /\b50\b/.test(name)) return 'sewer-pipe-50-internal'
  return ''
}

function matchOfficial(row, familyKey, officialProducts) {
  const signature = variantSignature(row.name, familyKey)
  const candidates = officialProducts.filter((product) => product.familyKey === familyKey)
  if (!candidates.length) return { confidence: 'none', product: null }

  const ranked = candidates.map((product) => {
    const candidateSignature = variantSignature(product.name, familyKey)
    let score = signature && candidateSignature === signature ? 100 : 0
    const rowTokens = new Set(normalize(cleanPriceName(row.name)).split(' ').filter((token) => token.length > 2))
    const candidateTokens = normalize(product.name).split(' ').filter((token) => token.length > 2)
    score += candidateTokens.filter((token) => rowTokens.has(token)).length * 2
    return { product, score, candidateSignature }
  }).sort((a, b) => b.score - a.score)

  const best = ranked[0]
  if (best.score >= 100) return { confidence: 'exact', product: best.product }
  if (best.score >= 10) return { confidence: 'high', product: best.product }
  return { confidence: 'low', product: best.product }
}

function imageObject(slug, titleRu, localImagePath, fallbackPath) {
  return {
    src: localImagePath || fallbackPath,
    alt: `${titleRu} — StroyRayon`,
    width: localImagePath ? 900 : 768,
    height: localImagePath ? 900 : 512,
    type: localImagePath ? 'packshot' : 'category',
    fallbackSrc: fallbackPath,
    expectedSrc: localImagePath || fallbackPath,
  }
}

function buildFamilyProducts(rows, officialProducts, csvBySku) {
  const groups = new Map()
  const matchDetails = []

  for (const row of rows) {
    const familyKey = classifyPriceRow(row)
    if (!familyKey || !familyConfigs[familyKey]) continue
    const match = matchOfficial(row, familyKey, officialProducts)
    const official = match.product
    const acceptedOfficialSku = official?.sku && ['exact', 'high'].includes(match.confidence)
    const sku = acceptedOfficialSku
      ? official.sku
      : `EVP-PDF-${createHash('sha1').update(`${familyKey}|${row.name}`).digest('hex').slice(0, 10).toUpperCase()}`
    const technical = official ? csvBySku.get(normalizeSku(official.sku)) || {} : {}
    const group = groups.get(familyKey) || { familyKey, rows: [], officialImages: [], sourceUrls: [] }
    group.rows.push({ ...row, official, sku, technical, confidence: match.confidence })
    if (official?.picture) group.officialImages.push(official.picture)
    if (official?.url) group.sourceUrls.push(official.url)
    groups.set(familyKey, group)
    matchDetails.push({ familyKey, priceName: row.name, retailPrice: row.retailPrice, unit: row.unit, confidence: match.confidence, officialSku: official?.sku || '', officialName: official?.name || '', hasPicture: Boolean(official?.picture) })
  }

  const products = [...groups.values()].map((group) => {
    const config = familyConfigs[group.familyKey]
    const slug = `ever-plast-${group.familyKey}`
    const fallback = group.familyKey.startsWith('ppr-')
      ? '/images/categories/generated/engineering/ppr-system.webp'
      : '/images/categories/generated/engineering/sewerage.webp'
    const generatedAsset = generatedSewerAssetByFamily[group.familyKey]
    const localImage = group.officialImages.length
      ? `/images/products/${slug}/main.webp`
      : generatedAsset
        ? `/images/products/ever-plast-sewer-assets/${generatedAsset}`
        : ''
    const variants = group.rows
      .map((item, index) => ({
        id: `${slug}-${index + 1}-${slugify(variantLabel(item, group.familyKey)) || 'variant'}`,
        size: variantLabel(item, group.familyKey),
        titleKg: variantLabel(item, group.familyKey),
        titleRu: variantLabel(item, group.familyKey),
        price: item.retailPrice,
        unit: item.unit,
        unitRu: item.unit === 'метр' ? 'метр' : 'шт.',
        packageInfo: `1 ${item.unit}`,
        packageInfoRu: item.unit === 'метр' ? '1 метр' : '1 шт.',
        stockStatus: 'in_stock',
        sku: item.sku,
        sortOrder: index,
        specs: {
          Размер: variantLabel(item, group.familyKey),
          Материал: item.technical.material || (group.familyKey.startsWith('ppr-') ? 'PPR' : 'Полипропилен'),
          Цвет: item.technical.color || (/external/.test(group.familyKey) ? 'оранжевый' : group.familyKey.startsWith('sewer-') ? 'серый' : 'белый'),
        },
      }))
      .sort((a, b) => a.size.localeCompare(b.size, 'ru', { numeric: true }))

    const image = imageObject(slug, config.titleRu, localImage, fallback)
    return {
      id: slug,
      slug,
      sku: `EVP-${group.familyKey.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
      titleKg: config.titleKg,
      titleRu: config.titleRu,
      brand: 'EVER PLAST',
      catalogPath: config.catalogPath,
      categorySlug: group.familyKey.startsWith('ppr-') ? 'pipes' : 'sewerage',
      subcategorySlug: group.familyKey.startsWith('ppr-') ? 'ppr-pipes' : 'sewer-pipes',
      productType: config.productType,
      productTypeRu: config.productTypeRu,
      price: Math.min(...variants.map((variant) => variant.price)),
      currency: 'KGS',
      unit: config.unit,
      unitRu: config.unit === 'метр' ? 'метр' : 'шт.',
      stockStatus: 'in_stock',
      minOrder: `1 ${config.unit}`,
      minOrderRu: config.unit === 'метр' ? '1 метр' : '1 шт.',
      pack: `1 ${config.unit}`,
      packRu: config.unit === 'метр' ? '1 метр' : '1 шт.',
      shortDescriptionKg: `${config.titleKg}: керектүү өлчөмдү түрлөрдүн арасынан тандаңыз. Баа 30.05.2026 күнкү баа тизмесинин негизинде жаңыртылган.`,
      shortDescriptionRu: `${config.titleRu}: выберите нужный размер в вариантах. Цена обновлена по прайсу от 30.05.2026.`,
      fullDescriptionKg: `${config.titleKg} суу, жылытуу же канализация системасын орнотууга арналган. Диаметрди, туташуу түрүн жана колдонуу шарттарын долбоор боюнча текшериңиз.`,
      fullDescriptionRu: `${config.titleRu} предназначен для монтажа инженерной системы. Перед заказом проверьте диаметр, тип соединения и условия применения по проекту.`,
      specs: { Өндүрүүчү: 'EVER PLAST', Материал: group.familyKey.startsWith('ppr-') ? 'PPR' : 'Полипропилен', 'Баа тизмесинин датасы': '30.05.2026', 'Түрлөрүнүн саны': `${variants.length}` },
      specsRu: { Бренд: 'EVER PLAST', Материал: group.familyKey.startsWith('ppr-') ? 'PPR' : 'Полипропилен', 'Дата прайса': '30.05.2026', Варианты: `${variants.length}` },
      images: [image],
      image,
      imageStatus: group.officialImages.length ? 'ready-official' : generatedAsset ? 'ready-generated' : 'category-fallback',
      isPlaceholderImage: false,
      variants,
      tags: ['new', 'quality'],
      aliases: [config.titleRu, config.titleKg, ...variants.map((variant) => variant.size)],
      sourceUrl: group.sourceUrls[0] || EVER_BASE,
      sourceImageUrl: group.officialImages[0] || '',
      priceSource: 'supplier_pdf_markup_20_percent',
      priceDate: PRICE_DATE,
      markupPercent: 20,
      isActive: true,
    }
  }).filter((product) => product.variants.length)

  return { products, groups, matchDetails }
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'StroyRayon catalog importer' } })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return response.text()
}

async function downloadImages(products) {
  const results = []
  for (const product of products) {
    if (!product.sourceImageUrl) {
      results.push({ slug: product.slug, status: product.imageStatus })
      continue
    }
    const outputDir = path.join(IMAGE_ROOT, product.slug)
    const outputPath = path.join(outputDir, 'main.webp')
    await mkdir(outputDir, { recursive: true })
    const response = await fetch(product.sourceImageUrl, { headers: { 'User-Agent': 'StroyRayon catalog importer' } })
    if (!response.ok) {
      results.push({ slug: product.slug, status: `download-${response.status}` })
      continue
    }
    const input = Buffer.from(await response.arrayBuffer())
    await sharp(input)
      .resize(820, 820, { fit: 'inside', withoutEnlargement: true })
      .extend({ top: 40, bottom: 40, left: 40, right: 40, background: '#f4f6f3' })
      .resize(900, 900, { fit: 'contain', background: '#f4f6f3' })
      .webp({ quality: 84, smartSubsample: true })
      .toFile(outputPath)
    results.push({ slug: product.slug, status: 'ready', bytes: (await stat(outputPath)).size })
  }
  return results
}

function generatedModule(products, meta) {
  return `// Generated by scripts/import-ever-plast-catalog.mjs\n// Sources: EVER PLAST XML/CSV and local supplier PDF price lists\n// Public prices: purchase price + 20%, rounded up to 1 KGS\n// Generated at: ${meta.generatedAt}\n\nexport const everPlastProducts = ${JSON.stringify(products, null, 2)}\n\nexport const everPlastCatalogImportMeta = ${JSON.stringify(meta, null, 2)}\n`
}

function publicSummary(meta) {
  return `# EVER PLAST import summary\n\nGenerated: ${meta.generatedAt}\n\n- Price date: ${PRICE_DATE}\n- Markup: 20%\n- PDF rows parsed: ${meta.parsedPriceRows}\n- Eligible PPR/sewer rows: ${meta.eligibleRows}\n- Product families: ${meta.productCount}\n- Variants: ${meta.variantCount}\n- Exact/high official matches: ${meta.acceptedMatchCount}\n- Low/no official matches: ${meta.reviewMatchCount}\n- Families with official packshots: ${meta.officialImageFamilyCount}\n- Families with generated studio packshots: ${meta.generatedImageFamilyCount}\n- Families using a category fallback: ${meta.categoryFallbackFamilyCount}\n\nPurchase prices are excluded from tracked/public files. The private reconciliation report is gitignored.\n`
}

async function findPricePdf(prefix) {
  const files = await readdir(desktopDir)
  const match = files.find((name) => name.startsWith(`${prefix} `) && name.includes(PRICE_DATE) && name.toLowerCase().endsWith('.pdf'))
  if (!match) throw new Error(`Price PDF not found in ${desktopDir}: ${prefix} *${PRICE_DATE}*.pdf`)
  return path.join(desktopDir, match)
}

export async function runImport() {
  const [pprPdf, pvcPdf] = await Promise.all([findPricePdf('ПП'), findPricePdf('ПВХ')])
  const [pprExtract, pvcExtract, xmlText, csvText] = await Promise.all([
    extractPdfLines(pprPdf),
    extractPdfLines(pvcPdf),
    fetchText(XML_URL),
    fetchText(CSV_URL),
  ])
  const priceRows = [...parsePriceLines(pprExtract.lines, 'ppr'), ...parsePriceLines(pvcExtract.lines, 'pvc')]
  const xml = parseXmlCatalog(xmlText)
  const csvBySku = parseCsvCatalog(csvText)
  const officialProducts = xml.products.map((product) => ({ ...product, familyKey: classifyOfficialProduct(product) }))
  const eligibleRows = priceRows.filter((row) => classifyPriceRow(row))
  const { products, groups, matchDetails } = buildFamilyProducts(eligibleRows, officialProducts, csvBySku)
  const imageResults = await downloadImages(products)
  const generatedAt = new Date().toISOString()
  const acceptedMatchCount = matchDetails.filter((item) => ['exact', 'high'].includes(item.confidence)).length
  const meta = {
    generatedAt,
    priceDate: PRICE_DATE,
    markupPercent: 20,
    pprPdfPages: pprExtract.pages,
    pvcPdfPages: pvcExtract.pages,
    parsedPriceRows: priceRows.length,
    eligibleRows: eligibleRows.length,
    productCount: products.length,
    variantCount: products.reduce((sum, product) => sum + product.variants.length, 0),
    acceptedMatchCount,
    reviewMatchCount: matchDetails.length - acceptedMatchCount,
    officialImageFamilyCount: products.filter((product) => product.imageStatus === 'ready-official').length,
    generatedImageFamilyCount: products.filter((product) => product.imageStatus === 'ready-generated').length,
    categoryFallbackFamilyCount: products.filter((product) => product.imageStatus === 'category-fallback').length,
  }

  await mkdir(PUBLIC_REPORT_DIR, { recursive: true })
  await mkdir(PRIVATE_REPORT_DIR, { recursive: true })
  await writeFile(OUTPUT_FILE, generatedModule(products, meta), 'utf8')
  await writeFile(path.join(PUBLIC_REPORT_DIR, 'summary.md'), publicSummary(meta), 'utf8')
  await writeFile(path.join(PUBLIC_REPORT_DIR, 'pilot-ppr-families.json'), JSON.stringify(products.filter((product) => product.slug.includes('ppr-')).slice(0, 12), null, 2), 'utf8')
  await writeFile(path.join(PUBLIC_REPORT_DIR, 'match-quality.json'), JSON.stringify(matchDetails.map(({ retailPrice, ...item }) => ({ ...item, retailPrice })), null, 2), 'utf8')
  await writeFile(path.join(PRIVATE_REPORT_DIR, 'purchase-price-reconciliation.json'), JSON.stringify({ generatedAt, priceRows, eligibleRows, matchDetails, imageResults, familyKeys: [...groups.keys()] }, null, 2), 'utf8')
  const { syncCatalog } = await import('./sync-catalog.mjs')
  await syncCatalog({ log: false })

  return meta
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) {
  runImport()
    .then((meta) => console.log(JSON.stringify(meta, null, 2)))
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
