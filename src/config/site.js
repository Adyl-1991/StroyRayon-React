const runtimeSiteUrl =
  import.meta.env?.VITE_SITE_URL ||
  globalThis.process?.env?.SITE_URL ||
  'https://stroyrayon.kg'

export const siteConfig = {
  name: 'StroyRayon',
  siteUrl: runtimeSiteUrl.replace(/\/+$/, ''),
  defaultDescription:
    'StroyRayon — курулуш материалдарын оңой тандап, WhatsApp аркылуу буйрутма берүүгө жардам берген интернет-дүкөн.',
}
