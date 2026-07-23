import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { siteConfig } from '../src/config/site.js'
import { catalogTree } from '../src/data/catalogTree.js'
import { products } from '../src/data/products.js'
import { normalizeKyrgyzContent, normalizeKyrgyzText } from '../src/i18n/kyrgyzText.js'
import { translations } from '../src/i18n/translations.js'
import { getSitemapRoutes } from '../src/scripts/generateSitemap.js'
import {
  getCatalogBreadcrumbs,
  getProductListField,
  getProductSpecs,
  getProductTitle,
  getProductsByCatalogNode,
} from '../src/services/productService.js'
import { getProductImage } from '../src/utils/imageUtils.js'
import { formatSeoTitle, getRobotsContent } from '../src/utils/seoMeta.js'
import {
  buildBreadcrumbStructuredData,
  buildCatalogPageStructuredData,
  buildFaqStructuredData,
  buildOrganizationStructuredData,
  buildProductStructuredData,
  buildWebPageStructuredData,
  buildWebSiteStructuredData,
  combineStructuredData,
  getCatalogNodeSeo,
  getPageCanonical,
  getProductSeo,
} from '../src/utils/seoUtils.js'
import { absoluteUrl } from '../src/utils/siteSeoUtils.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(projectRoot, 'dist')
const baseHtmlPath = path.join(distDir, 'index.html')
const seoMarkerStart = '<!-- stroyrayon:seo:start -->'
const seoMarkerEnd = '<!-- stroyrayon:seo:end -->'
const kg = translations.kg

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function serializeJsonLd(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

function buildPrerenderBody({ title, description, body = {} }) {
  const bodyTitle = body.title || title
  const breadcrumbs = (body.breadcrumbs || [])
    .filter((item) => item?.label)
    .map((item) => item.to
      ? `<a href="${escapeHtml(item.to)}">${escapeHtml(item.label)}</a>`
      : `<span aria-current="page">${escapeHtml(item.label)}</span>`)
    .join('<span aria-hidden="true"> / </span>')
  const links = (body.links || [])
    .filter((item) => item?.label && item?.to)
    .map((item) => `<li><a href="${escapeHtml(item.to)}">${escapeHtml(item.label)}</a></li>`)
    .join('')
  const specs = (body.specs || [])
    .filter((item) => item?.name && item?.value)
    .map((item) => `<div><dt>${escapeHtml(item.name)}</dt><dd>${escapeHtml(item.value)}</dd></div>`)
    .join('')
  const faq = (body.faq || [])
    .filter((item) => item?.question && item?.answer)
    .map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`)
    .join('')
  const image = body.image
    ? `<img src="${escapeHtml(absoluteUrl(body.image.src))}" alt="${escapeHtml(body.image.alt || bodyTitle)}" width="${Number(body.image.width) || 900}" height="${Number(body.image.height) || 675}" />`
    : ''

  return [
    '<main class="page seo-prerender-content" data-seo-prerender="true">',
    breadcrumbs ? `<nav aria-label="Багыттоо">${breadcrumbs}</nav>` : '',
    `<h1>${escapeHtml(bodyTitle)}</h1>`,
    description ? `<p>${escapeHtml(description)}</p>` : '',
    image,
    body.price ? `<p><strong>${escapeHtml(body.price)}</strong></p>` : '',
    links ? `<section><h2>${escapeHtml(body.linksTitle || 'Бөлүмдөр жана товарлар')}</h2><ul>${links}</ul></section>` : '',
    specs ? `<section><h2>Мүнөздөмөлөрү</h2><dl>${specs}</dl></section>` : '',
    faq ? `<section><h2>Көп берилүүчү суроолор</h2>${faq}</section>` : '',
    '</main>',
  ].filter(Boolean).join('')
}

function stripBaseSeo(html) {
  return html
    .replace(new RegExp(`${seoMarkerStart}[\\s\\S]*?${seoMarkerEnd}\\s*`, 'g'), '')
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta\b(?=[^>]*(?:name|property)=["'](?:description|robots|googlebot|og:[^"']+|twitter:[^"']+)["'])[^>]*>\s*/gi, '')
    .replace(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>\s*/gi, '')
    .replace(/<script\b[^>]*id=["']stroyrayon-jsonld["'][^>]*>[\s\S]*?<\/script>\s*/gi, '')
}

function buildSeoBlock({ title, description, canonical, image, imageAlt, type = 'website', structuredData }) {
  const fullTitle = formatSeoTitle(title)
  const canonicalUrl = getPageCanonical(new URL(canonical || '/', siteConfig.siteUrl).pathname)
  const ogImage = absoluteUrl(image || siteConfig.defaultOgImage)
  const ogImageAlt = imageAlt || fullTitle
  const robots = getRobotsContent(false)
  const tags = [
    `<title>${escapeHtml(fullTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${escapeHtml(robots)}" />`,
    `<meta name="googlebot" content="${escapeHtml(robots)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(siteConfig.name)}" />`,
    `<meta property="og:locale" content="${escapeHtml(siteConfig.defaultLocale)}" />`,
    `<meta property="og:type" content="${escapeHtml(type)}" />`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(ogImageAlt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(ogImageAlt)}" />`,
  ]

  if (structuredData) {
    tags.push(`<script id="stroyrayon-jsonld" type="application/ld+json">${serializeJsonLd(structuredData)}</script>`)
  }

  return `${seoMarkerStart}\n    ${tags.join('\n    ')}\n    ${seoMarkerEnd}`
}

export function injectSeo(html, seo) {
  const cleanHtml = stripBaseSeo(html)
  const seoBlock = buildSeoBlock(seo)
  if (!cleanHtml.includes('</head>')) throw new Error('SEO prerender failed: </head> was not found.')
  const htmlWithHead = cleanHtml.replace('</head>', `    ${seoBlock}\n  </head>`)
  const bodyMarkup = buildPrerenderBody(seo)
  return htmlWithHead.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${bodyMarkup}</div>`)
}

function flattenCatalog(nodes, parentPath = [], ancestors = []) {
  return nodes.flatMap((node) => {
    const nodePath = [...parentPath, node.slug]
    const record = { node: { ...node, path: nodePath }, path: nodePath, ancestors }
    return [record, ...flattenCatalog(node.children || [], nodePath, [...ancestors, node])]
  })
}

export function buildRouteDefinitions() {
  const routes = new Map()
  const add = (route, seo) => {
    if (routes.has(route)) throw new Error(`Duplicate SEO prerender route: ${route}`)
    routes.set(route, {
      ...seo,
      title: normalizeKyrgyzText(seo.title),
      description: normalizeKyrgyzText(seo.description),
      imageAlt: normalizeKyrgyzText(seo.imageAlt),
      structuredData: normalizeKyrgyzContent(seo.structuredData),
      body: normalizeKyrgyzContent(seo.body),
    })
  }

  add('/', {
    title: siteConfig.name,
    description: siteConfig.defaultDescription,
    canonical: getPageCanonical('/'),
    structuredData: combineStructuredData(
      buildOrganizationStructuredData(),
      buildWebSiteStructuredData(),
    ),
    body: {
      linksTitle: kg.home.categoriesTitle,
      links: catalogTree.map((node) => ({
        label: node.titleKg,
        to: `/catalog/${node.slug}`,
      })),
    },
  })

  add('/catalog', {
    title: kg.catalog.title,
    description: kg.catalog.description,
    canonical: getPageCanonical('/catalog'),
    structuredData: buildCatalogPageStructuredData({
      path: '/catalog',
      title: kg.catalog.title,
      description: kg.catalog.description,
      items: catalogTree.map((node) => ({
        name: node.titleKg,
        url: `/catalog/${node.slug}`,
      })),
    }),
    body: {
      breadcrumbs: [{ label: kg.common.catalog }],
      linksTitle: kg.common.sections,
      links: catalogTree.map((node) => ({
        label: node.titleKg,
        to: `/catalog/${node.slug}`,
      })),
    },
  })

  const staticPages = [
    ['/contacts', kg.static.contacts.title, kg.static.contacts.description, 'ContactPage'],
    ['/delivery', kg.static.delivery.title, kg.static.delivery.description, 'WebPage'],
    ['/payment', kg.static.payment.title, kg.static.payment.description, 'WebPage'],
    ['/return', kg.static.return.title, kg.static.return.description, 'WebPage'],
    ['/about', kg.static.about.title, kg.static.about.description, 'AboutPage'],
    ['/privacy', kg.static.privacy.title, kg.static.privacy.description, 'WebPage'],
    ['/blog', kg.home.adviceTitle, kg.home.adviceText, 'CollectionPage'],
  ]

  staticPages.forEach(([route, title, description, type]) => {
    add(route, {
      title,
      description,
      canonical: getPageCanonical(route),
      structuredData: type === 'CollectionPage'
        ? buildCatalogPageStructuredData({ path: route, title, description })
        : buildWebPageStructuredData({ path: route, title, description, type }),
      body: {
        breadcrumbs: [{ label: title }],
      },
    })
  })

  flattenCatalog(catalogTree).forEach(({ node, path: nodePath, ancestors }) => {
    const route = `/catalog/${nodePath.join('/')}`
    const seo = getCatalogNodeSeo(node, 'kg')
    const title = node.titleKg || seo.title
    const description = node.descriptionKg || seo.description
    const breadcrumbs = [
      { label: kg.common.catalog, to: '/catalog' },
      ...ancestors.map((ancestor, index) => ({
        label: ancestor.titleKg,
        to: `/catalog/${nodePath.slice(0, index + 1).join('/')}`,
      })),
      { label: title },
    ]
    const childLinks = (node.children || []).map((child) => ({
      label: child.titleKg,
      to: `${route}/${child.slug}`,
    }))
    const productLinks = getProductsByCatalogNode(node)
      .slice(0, 48)
      .map((product) => ({
        label: getProductTitle(product, 'kg'),
        to: `/product/${product.slug}`,
      }))

    add(route, {
      title,
      description,
      canonical: seo.canonical,
      structuredData: combineStructuredData(
        buildCatalogPageStructuredData({
          path: route,
          title,
          description,
          items: [...childLinks, ...productLinks].map((item) => ({
            name: item.label,
            url: item.to,
          })),
        }),
        buildBreadcrumbStructuredData(breadcrumbs),
      ),
      body: {
        breadcrumbs,
        linksTitle: node.children?.length ? kg.common.sections : kg.common.products,
        links: [...childLinks, ...productLinks],
      },
    })
  })

  products.filter((product) => product.isActive !== false).forEach((product) => {
    const route = `/product/${product.slug}`
    const seo = getProductSeo(product, 'kg')
    const productTitle = getProductTitle(product, 'kg')
    const productImage = getProductImage(product)
    const seoImage = productImage.type === 'placeholder' || productImage.src.includes('/placeholders/')
      ? undefined
      : productImage
    const faqItems = getProductListField(product, 'faq', 'kg')
    const productSpecs = Object.entries(getProductSpecs(product, 'kg') || {})
      .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value) && String(value).trim())
      .slice(0, 12)
      .map(([name, value]) => ({ name, value: String(value) }))
    const catalogBreadcrumbs = getCatalogBreadcrumbs(product.catalogPath || [])
    const breadcrumbItems = [
      { label: kg.common.catalog, to: '/catalog' },
      ...catalogBreadcrumbs.map((item) => ({
        label: item.titleKg,
        to: `/catalog/${item.path.join('/')}`,
      })),
      { label: productTitle },
    ]

    add(route, {
      title: seo.title,
      description: seo.description,
      canonical: seo.canonical,
      image: seoImage?.src,
      imageAlt: productTitle,
      type: 'product',
      structuredData: combineStructuredData(
        buildProductStructuredData(product, 'kg'),
        buildBreadcrumbStructuredData(breadcrumbItems),
        buildFaqStructuredData(faqItems),
      ),
      body: {
        title: productTitle,
        breadcrumbs: breadcrumbItems,
        image: seoImage,
        price: Number(product.price) > 0
          ? `${Number(product.price).toLocaleString('ru-RU')} сом / ${product.unit || 'даана'}`
          : kg.product.priceNotSet,
        specs: productSpecs,
        faq: faqItems,
      },
    })
  })

  return routes
}

function outputPathForRoute(route) {
  return route === '/'
    ? baseHtmlPath
    : path.join(distDir, ...route.split('/').filter(Boolean), 'index.html')
}

export async function prerenderSeo() {
  const baseHtml = await readFile(baseHtmlPath, 'utf8')
  const routeDefinitions = buildRouteDefinitions()
  const sitemapRoutes = getSitemapRoutes()
  const missingRoutes = sitemapRoutes.filter((route) => !routeDefinitions.has(route))
  const extraRoutes = [...routeDefinitions.keys()].filter((route) => !sitemapRoutes.includes(route))

  if (missingRoutes.length || extraRoutes.length) {
    throw new Error([
      missingRoutes.length ? `Missing SEO routes: ${missingRoutes.join(', ')}` : '',
      extraRoutes.length ? `Unexpected SEO routes: ${extraRoutes.join(', ')}` : '',
    ].filter(Boolean).join('\n'))
  }

  for (const [route, seo] of routeDefinitions) {
    const outputPath = outputPathForRoute(route)
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, injectSeo(baseHtml, seo), 'utf8')
  }

  const productRoutes = [...routeDefinitions.keys()].filter((route) => route.startsWith('/product/')).length
  const catalogRoutes = [...routeDefinitions.keys()].filter((route) => route.startsWith('/catalog/')).length
  const summary = { routes: routeDefinitions.size, productRoutes, catalogRoutes }
  console.log(`Prerendered SEO HTML for ${summary.routes} routes (${productRoutes} products, ${catalogRoutes} catalog pages).`)
  return summary
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  prerenderSeo().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
