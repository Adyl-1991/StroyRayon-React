import { useEffect, useState } from 'react'
import { useLocale } from '../../i18n/LocaleContext'

const DISMISSED_AT_KEY = 'stroyrayon.pwa-install-dismissed-at'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
}

function wasRecentlyDismissed() {
  const dismissedAt = Number(window.localStorage.getItem(DISMISSED_AT_KEY) || 0)
  return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_TTL_MS
}

export function PwaInstallPrompt() {
  const { t } = useLocale()
  const [installPrompt, setInstallPrompt] = useState(null)
  const [visible, setVisible] = useState(() => isIosDevice() && !isStandalone() && !wasRecentlyDismissed())
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return undefined

    const handleInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
      setVisible(true)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
      setShowIosGuide(false)
      setVisible(false)
      window.localStorage.removeItem(DISMISSED_AT_KEY)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  function dismiss() {
    window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
    setVisible(false)
    setShowIosGuide(false)
  }

  async function install() {
    if (!installPrompt) {
      if (isIosDevice()) setShowIosGuide(true)
      return
    }

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setVisible(false)
    } else {
      window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
      setVisible(false)
    }
    setInstallPrompt(null)
  }

  if (!visible) return null

  return (
    <>
      <aside className="pwa-install-banner" aria-label={t('pwa.bannerLabel')}>
        <img src="/icons/pwa-192.png" alt="" width="46" height="46" />
        <div className="pwa-install-banner__copy">
          <strong>{t('pwa.bannerTitle')}</strong>
          <small>{t('pwa.bannerText')}</small>
        </div>
        <button className="pwa-install-banner__install" type="button" onClick={install}>
          {t('pwa.install')}
        </button>
        <button className="pwa-install-banner__close" type="button" aria-label={t('pwa.later')} onClick={dismiss}>
          ×
        </button>
      </aside>

      {showIosGuide && (
        <div className="pwa-install-dialog" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowIosGuide(false)}>
          <section className="pwa-install-dialog__sheet" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
            <div className="pwa-install-dialog__handle" aria-hidden="true" />
            <div className="pwa-install-dialog__title">
              <span aria-hidden="true">↥</span>
              <h2 id="pwa-install-title">{t('pwa.iosTitle')}</h2>
            </div>
            <ol className="pwa-install-dialog__steps">
              <li>
                <span>1</span>
                <div><strong>{t('pwa.iosStepOne')}</strong><small>{t('pwa.iosStepOneHint')}</small></div>
              </li>
              <li>
                <span>2</span>
                <div><strong>{t('pwa.iosStepTwo')}</strong><small>{t('pwa.iosStepTwoHint')}</small></div>
              </li>
            </ol>
            <button className="pwa-install-dialog__done" type="button" onClick={() => setShowIosGuide(false)}>
              {t('pwa.done')}
            </button>
          </section>
        </div>
      )}
    </>
  )
}
