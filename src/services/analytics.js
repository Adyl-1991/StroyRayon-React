const GA_SCRIPT_ID = 'stroyrayon-ga4-script'
const GOOGLE_TAG_URL = 'https://www.googletagmanager.com/gtag/js?id='

function getMeasurementId() {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()
  return /^G-[A-Z0-9]+$/.test(measurementId || '') ? measurementId : null
}

function isProductionSite() {
  if (!import.meta.env.PROD || typeof window === 'undefined') return false

  try {
    return window.location.hostname === new URL(import.meta.env.VITE_SITE_URL).hostname
  } catch {
    return false
  }
}

function isPublicStorefrontPath(pathname) {
  return !pathname.startsWith('/admin')
}

function pageViewParameters(location) {
  const pagePath = location.pathname || '/'

  return {
    page_title: document.title,
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
  }
}

export function initializeAnalytics(router) {
  const measurementId = getMeasurementId()
  if (!measurementId || !isProductionSite() || !router || window.__stroyrayonGa4Initialized) return

  window.__stroyrayonGa4Initialized = true
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments)
  }

  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })

  if (!document.getElementById(GA_SCRIPT_ID)) {
    const script = document.createElement('script')
    script.id = GA_SCRIPT_ID
    script.async = true
    script.src = `${GOOGLE_TAG_URL}${encodeURIComponent(measurementId)}`
    document.head.append(script)
  }

  let lastTrackedPath = null
  const trackPageView = (location) => {
    if (!location || !isPublicStorefrontPath(location.pathname)) return

    // Intentionally omit search/hash values: they can contain customer data.
    const pagePath = location.pathname || '/'
    if (pagePath === lastTrackedPath) return

    lastTrackedPath = pagePath
    window.gtag?.('event', 'page_view', pageViewParameters(location))
  }

  trackPageView(router.state.location)
  router.subscribe((state) => trackPageView(state.location))
}
