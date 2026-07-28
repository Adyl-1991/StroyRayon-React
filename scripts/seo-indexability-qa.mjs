import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const DEFAULT_BASE_URL = 'https://www.stroyrayon.kg'
const DEFAULT_CONCURRENCY = 8
const DEFAULT_TIMEOUT_MS = 20_000
const MAX_REDIRECTS = 10
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const PRIVATE_ROUTES = [
  '/admin',
  '/admin/login',
  '/admin/orders',
  '/admin/products',
  '/cart',
  '/checkout',
  '/search',
]

function normalizeOrigin(value, fallback = DEFAULT_BASE_URL) {
  try {
    return new URL(String(value || fallback)).origin
  } catch {
    return new URL(fallback).origin
  }
}

function normalizePathname(value) {
  const pathname = new URL(value, DEFAULT_BASE_URL).pathname.replace(/\/{2,}/g, '/')
  if (pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

function normalizeIndexableUrl(value, canonicalOrigin) {
  const url = new URL(value, canonicalOrigin)
  const pathname = normalizePathname(url)
  return `${canonicalOrigin}${pathname}`
}

function decodeHtml(value = '') {
  const entities = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  }

  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match)
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTags(value = '') {
  return decodeHtml(String(value).replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
}

function getAttribute(tag, attribute) {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return decodeHtml(
    tag.match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]
      || tag.match(new RegExp(`\\b${escaped}\\s*=\\s*([^\\s>]+)`, 'i'))?.[1]
      || '',
  )
}

function findMeta(html, key, value) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (getAttribute(tag, key).toLowerCase() === value.toLowerCase()) {
      return getAttribute(tag, 'content')
    }
  }
  return ''
}

function findCanonical(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (getAttribute(tag, 'rel').toLowerCase().split(/\s+/).includes('canonical')) {
      return getAttribute(tag, 'href')
    }
  }
  return ''
}

function parseHtml(html, pageUrl, canonicalOrigin) {
  const title = stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
  const description = findMeta(html, 'name', 'description')
  const robots = findMeta(html, 'name', 'robots')
  const canonical = findCanonical(html)
  const ogUrl = findMeta(html, 'property', 'og:url')
  const h1Values = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => stripTags(match[1]))
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || ''
  const lang = getAttribute(htmlTag, 'lang').toLowerCase()
  const links = []

  for (const tag of html.match(/<a\b[^>]*>/gi) || []) {
    const href = getAttribute(tag, 'href')
    if (!href || /^(#|mailto:|tel:|sms:|javascript:)/i.test(href)) continue

    try {
      const target = new URL(href, pageUrl)
      if (target.origin !== canonicalOrigin) continue
      target.hash = ''
      links.push({
        href,
        url: `${canonicalOrigin}${normalizePathname(target)}`,
        hasQuery: Boolean(target.search),
      })
    } catch {
      links.push({ href, url: '', invalid: true, hasQuery: false })
    }
  }

  const jsonLd = []
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      jsonLd.push(JSON.parse(decodeHtml(match[1])))
    } catch (error) {
      jsonLd.push({ parseError: error.message })
    }
  }

  return {
    title,
    description,
    robots,
    canonical,
    ogUrl,
    h1: h1Values[0] || '',
    h1Count: h1Values.length,
    lang,
    links,
    jsonLd,
  }
}

async function fetchOnce(url, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      redirect: 'manual',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'StroyRayon-SEO-Indexability-QA/1.0',
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchWithRedirects(initialUrl, timeoutMs) {
  let currentUrl = initialUrl
  const redirectChain = []
  const seen = new Set()

  for (let index = 0; index <= MAX_REDIRECTS; index += 1) {
    if (seen.has(currentUrl)) {
      return { status: 0, finalUrl: currentUrl, redirectChain, html: '', error: 'redirect loop' }
    }
    seen.add(currentUrl)

    let response
    try {
      response = await fetchOnce(currentUrl, timeoutMs)
    } catch (error) {
      return {
        status: 0,
        finalUrl: currentUrl,
        redirectChain,
        html: '',
        error: error.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : error.message,
      }
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get('location')
      if (!location) {
        return { status: response.status, finalUrl: currentUrl, redirectChain, html: '', error: 'redirect without location' }
      }
      const nextUrl = new URL(location, currentUrl).href
      redirectChain.push({ status: response.status, from: currentUrl, to: nextUrl })
      currentUrl = nextUrl
      continue
    }

    const contentType = response.headers.get('content-type') || ''
    const html = /(text\/html|application\/(?:xml|xhtml\+xml)|text\/xml)/i.test(contentType)
      ? await response.text()
      : ''
    return {
      status: response.status,
      finalUrl: currentUrl,
      redirectChain,
      html,
      headers: Object.fromEntries(response.headers),
      error: '',
    }
  }

  return { status: 0, finalUrl: currentUrl, redirectChain, html: '', error: `more than ${MAX_REDIRECTS} redirects` }
}

async function mapLimit(items, concurrency, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

function getPageType(url) {
  const pathname = normalizePathname(url)
  if (pathname === '/') return 'home'
  if (pathname === '/catalog') return 'catalog'
  if (pathname.startsWith('/catalog/')) return 'catalog-node'
  if (pathname.startsWith('/product/')) return 'product'
  return 'information'
}

function groupDuplicates(records, field) {
  const groups = new Map()
  for (const record of records) {
    const value = String(record[field] || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
    if (!value) continue
    groups.set(value, [...(groups.get(value) || []), record.url])
  }
  return [...groups.values()].filter((urls) => urls.length > 1)
}

function summarizeIssues(records) {
  return records.flatMap((record) => record.issues.map((issue) => ({ url: record.url, issue })))
}

function parseSitemap(xml) {
  if (!/<urlset\b/i.test(xml) || !/<loc>/i.test(xml)) {
    throw new Error('Sitemap XML does not contain a valid urlset/loc structure.')
  }
  return [...xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)].map((match) => decodeHtml(match[1]))
}

async function auditPage(url, options) {
  const fetched = await fetchWithRedirects(url, options.timeoutMs)
  const parsed = fetched.html ? parseHtml(fetched.html, fetched.finalUrl, options.canonicalOrigin) : {
    title: '',
    description: '',
    robots: '',
    canonical: '',
    ogUrl: '',
    h1: '',
    h1Count: 0,
    lang: '',
    links: [],
    jsonLd: [],
  }
  const expectedCanonical = normalizeIndexableUrl(url, options.canonicalOrigin)
  const issues = []

  if (fetched.error) issues.push(fetched.error)
  if (fetched.redirectChain.length) issues.push(`${fetched.redirectChain.length} redirect(s)`)
  if (fetched.status !== 200) issues.push(`HTTP ${fetched.status}`)
  if (!parsed.canonical) issues.push('missing canonical')
  if (parsed.canonical && normalizeIndexableUrl(parsed.canonical, options.canonicalOrigin) !== expectedCanonical) {
    issues.push(`canonical mismatch: ${parsed.canonical}`)
  }
  if (parsed.ogUrl && normalizeIndexableUrl(parsed.ogUrl, options.canonicalOrigin) !== expectedCanonical) {
    issues.push(`og:url mismatch: ${parsed.ogUrl}`)
  }
  if (/\bnoindex\b/i.test(parsed.robots)) issues.push(`noindex in sitemap: ${parsed.robots}`)
  if (!parsed.title) issues.push('missing title')
  if (!parsed.description) issues.push('missing meta description')
  if (!parsed.h1) issues.push('missing H1')
  if (parsed.h1Count !== 1) issues.push(`H1 count ${parsed.h1Count}`)
  if (parsed.lang && !/^ky(?:-|$)/i.test(parsed.lang)) issues.push(`unexpected HTML lang: ${parsed.lang}`)
  if ((getPageType(url) === 'product' || getPageType(url) === 'catalog-node') && parsed.jsonLd.length === 0) {
    issues.push('missing JSON-LD')
  }
  if (parsed.jsonLd.some((item) => item.parseError)) issues.push('invalid JSON-LD')

  return {
    url,
    status: fetched.status,
    finalUrl: fetched.finalUrl,
    redirectCount: fetched.redirectChain.length,
    redirectChain: fetched.redirectChain,
    canonical: parsed.canonical,
    robots: parsed.robots,
    title: parsed.title,
    description: parsed.description,
    h1: parsed.h1,
    h1Count: parsed.h1Count,
    lang: parsed.lang,
    pageType: getPageType(url),
    links: parsed.links,
    jsonLdCount: parsed.jsonLd.length,
    issues,
  }
}

export async function runSeoIndexabilityAudit({
  baseUrl = process.env.SEO_BASE_URL || DEFAULT_BASE_URL,
  canonicalOrigin = process.env.SEO_CANONICAL_ORIGIN || DEFAULT_BASE_URL,
  concurrency = Number(process.env.SEO_CONCURRENCY || DEFAULT_CONCURRENCY),
  timeoutMs = Number(process.env.SEO_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  reportPath = process.env.SEO_REPORT_PATH || '',
  log = true,
} = {}) {
  const normalizedBaseOrigin = normalizeOrigin(baseUrl)
  const normalizedCanonicalOrigin = normalizeOrigin(canonicalOrigin)
  const options = {
    baseOrigin: normalizedBaseOrigin,
    canonicalOrigin: normalizedCanonicalOrigin,
    concurrency: Math.max(1, Math.min(32, Number.isFinite(concurrency) ? concurrency : DEFAULT_CONCURRENCY)),
    timeoutMs: Math.max(2_000, Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS),
  }
  const startedAt = new Date()
  const sitemapUrl = `${options.baseOrigin}/sitemap.xml`
  const sitemapFetch = await fetchWithRedirects(sitemapUrl, options.timeoutMs)
  const criticalIssues = []

  if (sitemapFetch.error) criticalIssues.push(`Sitemap fetch failed: ${sitemapFetch.error}`)
  if (sitemapFetch.status !== 200) criticalIssues.push(`Sitemap returned HTTP ${sitemapFetch.status}`)
  if (sitemapFetch.redirectChain.length) criticalIssues.push(`Sitemap redirects ${sitemapFetch.redirectChain.length} time(s)`)

  let sitemapUrls = []
  try {
    sitemapUrls = parseSitemap(sitemapFetch.html)
  } catch (error) {
    criticalIssues.push(error.message)
  }

  const duplicateSitemapUrls = sitemapUrls.filter((url, index) => sitemapUrls.indexOf(url) !== index)
  if (duplicateSitemapUrls.length) criticalIssues.push(`Duplicate sitemap URLs: ${[...new Set(duplicateSitemapUrls)].join(', ')}`)

  const sitemapOriginMismatches = sitemapUrls.filter((url) => {
    try {
      return new URL(url).origin !== options.canonicalOrigin
    } catch {
      return true
    }
  })
  if (sitemapOriginMismatches.length) {
    criticalIssues.push(`Sitemap canonical-origin mismatches: ${sitemapOriginMismatches.length}`)
  }

  const records = await mapLimit(sitemapUrls, options.concurrency, (url) => auditPage(url, options))
  const recordIssues = summarizeIssues(records)
  criticalIssues.push(...recordIssues.map(({ url, issue }) => `${url}: ${issue}`))

  const duplicateTitles = groupDuplicates(records, 'title')
  const duplicateDescriptions = groupDuplicates(records, 'description')
  const duplicateH1 = groupDuplicates(records, 'h1')
  criticalIssues.push(
    ...duplicateTitles.map((urls) => `Duplicate title: ${urls.join(', ')}`),
    ...duplicateDescriptions.map((urls) => `Duplicate meta description: ${urls.join(', ')}`),
  )

  const sitemapSet = new Set(sitemapUrls.map((url) => normalizeIndexableUrl(url, options.canonicalOrigin)))
  const incomingLinks = new Map([...sitemapSet].map((url) => [url, new Set()]))
  const internalLinkSources = new Map()

  for (const record of records) {
    for (const link of record.links) {
      if (!link.url || link.invalid) continue
      const key = link.url
      internalLinkSources.set(key, [...(internalLinkSources.get(key) || []), record.url])
      if (sitemapSet.has(key) && key !== record.url) incomingLinks.get(key).add(record.url)
    }
  }

  const uniqueInternalLinks = [...internalLinkSources.keys()]
  const internalLinkRecords = await mapLimit(uniqueInternalLinks, options.concurrency, async (url) => {
    const result = await fetchWithRedirects(url, options.timeoutMs)
    return {
      url,
      status: result.status,
      finalUrl: result.finalUrl,
      redirectCount: result.redirectChain.length,
      redirectChain: result.redirectChain,
      error: result.error,
      sources: [...new Set(internalLinkSources.get(url) || [])],
    }
  })
  const brokenInternalLinks = internalLinkRecords.filter((record) => record.error || record.status >= 400 || record.status === 0)
  const redirectingInternalLinks = internalLinkRecords.filter((record) => record.redirectCount > 0)
  const orphanUrls = [...incomingLinks.entries()]
    .filter(([url, sources]) => url !== `${options.canonicalOrigin}/` && sources.size === 0)
    .map(([url]) => url)
  criticalIssues.push(...orphanUrls.map((url) => `Orphan sitemap URL: ${url}`))

  criticalIssues.push(
    ...brokenInternalLinks.map((record) => `Broken internal link ${record.url}: ${record.error || `HTTP ${record.status}`}`),
    ...redirectingInternalLinks.map((record) => `Redirecting internal link ${record.url}: ${record.redirectCount} redirect(s)`),
  )

  const soft404ProbeUrl = `${options.baseOrigin}/__seo_indexability_missing_probe__`
  const soft404Probe = await fetchWithRedirects(soft404ProbeUrl, options.timeoutMs)
  const soft404Meta = soft404Probe.html
    ? parseHtml(soft404Probe.html, soft404Probe.finalUrl, options.canonicalOrigin)
    : null
  const soft404Detected = soft404Probe.status === 200
  if (soft404Detected) {
    criticalIssues.push(`Unknown route returns HTTP 200 (soft 404): ${soft404ProbeUrl}`)
  }

  const domainChecks = await mapLimit([
    `http://${new URL(options.canonicalOrigin).hostname.replace(/^www\./, '')}/`,
    `https://${new URL(options.canonicalOrigin).hostname.replace(/^www\./, '')}/`,
    `http://${new URL(options.canonicalOrigin).hostname}/`,
    `${options.canonicalOrigin}/`,
  ], 2, async (url) => {
    const result = await fetchWithRedirects(url, options.timeoutMs)
    return {
      url,
      status: result.status,
      finalUrl: result.finalUrl,
      redirectCount: result.redirectChain.length,
      redirectChain: result.redirectChain,
      error: result.error,
    }
  })

  const privateRouteChecks = await mapLimit(PRIVATE_ROUTES, options.concurrency, async (route) => {
    const url = `${options.baseOrigin}${route}`
    const fetched = await fetchWithRedirects(url, options.timeoutMs)
    const parsed = fetched.html ? parseHtml(fetched.html, fetched.finalUrl, options.canonicalOrigin) : null
    const xRobotsTag = fetched.headers?.['x-robots-tag'] || ''
    return {
      url,
      status: fetched.status,
      robots: parsed?.robots || '',
      xRobotsTag,
      noindex: /\bnoindex\b/i.test(`${parsed?.robots || ''} ${xRobotsTag}`),
    }
  })
  const privateRoutesMissingNoindex = privateRouteChecks.filter((record) => record.status === 200 && !record.noindex)
  criticalIssues.push(...privateRoutesMissingNoindex.map((record) => `Private route missing noindex: ${record.url}`))

  const summary = {
    generatedAt: new Date().toISOString(),
    durationSeconds: Number(((Date.now() - startedAt.getTime()) / 1000).toFixed(1)),
    baseUrl: options.baseOrigin,
    canonicalOrigin: options.canonicalOrigin,
    sitemapUrl,
    sitemapUrlCount: sitemapUrls.length,
    sitemapRedirectCount: records.filter((record) => record.redirectCount > 0).length,
    sitemap404Count: records.filter((record) => record.status === 404).length,
    sitemap5xxCount: records.filter((record) => record.status >= 500).length,
    sitemapNoindexCount: records.filter((record) => /\bnoindex\b/i.test(record.robots)).length,
    missingCanonicalCount: records.filter((record) => !record.canonical).length,
    canonicalMismatchCount: records.filter((record) => record.issues.some((issue) => issue.startsWith('canonical mismatch'))).length,
    missingTitleCount: records.filter((record) => !record.title).length,
    missingDescriptionCount: records.filter((record) => !record.description).length,
    missingH1Count: records.filter((record) => !record.h1).length,
    duplicateTitleGroupCount: duplicateTitles.length,
    duplicateDescriptionGroupCount: duplicateDescriptions.length,
    duplicateH1GroupCount: duplicateH1.length,
    internalLinkCount: internalLinkRecords.length,
    brokenInternalLinkCount: brokenInternalLinks.length,
    redirectingInternalLinkCount: redirectingInternalLinks.length,
    orphanUrlCount: orphanUrls.length,
    soft404Detected,
    privateRoutesMissingNoindexCount: privateRoutesMissingNoindex.length,
    multiHopDomainRedirectCount: domainChecks.filter((record) => record.redirectCount > 1).length,
    criticalIssueCount: criticalIssues.length,
  }

  const report = {
    summary,
    criticalIssues,
    duplicateTitles,
    duplicateDescriptions,
    duplicateH1,
    orphanUrls,
    brokenInternalLinks,
    redirectingInternalLinks,
    domainChecks,
    privateRouteChecks,
    soft404Probe: {
      url: soft404ProbeUrl,
      status: soft404Probe.status,
      finalUrl: soft404Probe.finalUrl,
      canonical: soft404Meta?.canonical || '',
      robots: soft404Meta?.robots || '',
      title: soft404Meta?.title || '',
    },
    sitemapOriginMismatches,
    records,
  }

  if (reportPath) {
    const absoluteReportPath = path.resolve(reportPath)
    await mkdir(path.dirname(absoluteReportPath), { recursive: true })
    await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  if (log) {
    console.log('StroyRayon SEO indexability audit')
    console.log(JSON.stringify(summary, null, 2))
    if (criticalIssues.length) {
      console.error('\nCritical issues:')
      criticalIssues.slice(0, 100).forEach((issue) => console.error(`- ${issue}`))
      if (criticalIssues.length > 100) console.error(`- ...and ${criticalIssues.length - 100} more`)
    }
    if (duplicateTitles.length) console.warn(`Duplicate title groups: ${duplicateTitles.length}`)
    if (duplicateDescriptions.length) console.warn(`Duplicate description groups: ${duplicateDescriptions.length}`)
    if (orphanUrls.length) console.warn(`Orphan sitemap URLs: ${orphanUrls.length}`)
    if (reportPath) console.log(`Detailed report: ${path.resolve(reportPath)}`)
  }

  return report
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  runSeoIndexabilityAudit()
    .then((report) => {
      if (report.summary.criticalIssueCount > 0) process.exitCode = 1
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
