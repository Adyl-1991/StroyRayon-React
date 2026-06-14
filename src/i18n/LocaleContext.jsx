/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { catalogTranslations, translations } from './translations'

const LocaleContext = createContext(null)
const STORAGE_KEY = 'stroyrayon.locale'

function getInitialLocale() {
  if (typeof window === 'undefined') return 'kg'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === 'ru' || saved === 'kg' ? saved : 'kg'
}

function readPath(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source)
}

function interpolate(text, params = {}) {
  if (typeof text !== 'string') return text
  return Object.entries(params).reduce((result, [key, value]) => result.replaceAll(`{{${key}}}`, value), text)
}

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(getInitialLocale)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale === 'ru' ? 'ru' : 'ky'
  }, [locale])

  const value = useMemo(() => {
    function t(path, params) {
      const translated = readPath(translations[locale], path) ?? readPath(translations.kg, path) ?? path
      return interpolate(translated, params)
    }

    function nodeText(node) {
      const bySlug = catalogTranslations[node?.slug]?.[locale]
      const fallback = catalogTranslations[node?.slug]?.kg
      const localeTitle = locale === 'ru' ? node?.titleRu : node?.titleKg
      const localeDescription = locale === 'ru' ? node?.descriptionRu : node?.descriptionKg
      const localeSeoText = locale === 'ru' ? node?.seoTextRu : node?.seoTextKg
      return {
        title: bySlug?.title || fallback?.title || localeTitle || node?.titleKg || node?.name || '',
        description: bySlug?.description || fallback?.description || localeDescription || node?.descriptionKg || node?.description || '',
        seoText: bySlug?.seoText || fallback?.seoText || localeSeoText || node?.seoTextKg || node?.seoText || '',
      }
    }

    return {
      locale,
      setLocale,
      toggleLocale: () => setLocale((current) => (current === 'kg' ? 'ru' : 'kg')),
      t,
      nodeText,
    }
  }, [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used inside LocaleProvider')
  }
  return context
}
