const canonicalProductionUrl = 'https://www.stroyrayon.kg'

export function normalizeSiteUrl(value) {
  const candidate = String(value || '').trim() || canonicalProductionUrl

  try {
    const url = new URL(candidate)
    if (url.hostname === 'stroyrayon.kg' || url.hostname === 'www.stroyrayon.kg') {
      return canonicalProductionUrl
    }
    return url.origin.replace(/\/+$/, '')
  } catch {
    return canonicalProductionUrl
  }
}

const runtimeSiteUrl =
  import.meta.env?.VITE_SITE_URL ||
  globalThis.process?.env?.SITE_URL ||
  canonicalProductionUrl

export const siteConfig = {
  name: 'StroyRayon',
  alternateNames: ['Stroy Rayon', 'СтройРайон', 'Строй Район'],
  siteUrl: normalizeSiteUrl(runtimeSiteUrl),
  defaultDescription:
    'StroyRayon — курулуш материалдарын оңой тандап, WhatsApp аркылуу буйрутма берүүгө жардам берген интернет-дүкөн.',
}
