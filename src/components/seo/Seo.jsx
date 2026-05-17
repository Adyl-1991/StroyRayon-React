import { useEffect } from 'react'
import { siteConfig } from '../../config/site'

function upsertMeta(name, content) {
  if (typeof document === 'undefined' || !content) return

  let meta = document.querySelector(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', name)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

function upsertLink(rel, href) {
  if (typeof document === 'undefined' || !href) return

  let link = document.querySelector(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', rel)
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

function upsertJsonLd(id, data) {
  if (typeof document === 'undefined') return

  let script = document.getElementById(id)
  if (!data) {
    script?.remove()
    return
  }

  if (!script) {
    script = document.createElement('script')
    script.id = id
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(data)
}

export function Seo({
  title = siteConfig.name,
  description = siteConfig.defaultDescription,
  canonical,
  structuredData,
}) {
  useEffect(() => {
    document.title = title === siteConfig.name ? title : `${title} | ${siteConfig.name}`
    upsertMeta('description', description)
    upsertLink('canonical', canonical || window.location.href)
    upsertJsonLd('stroyrayon-jsonld', structuredData)
  }, [canonical, description, structuredData, title])

  return null
}
