import { useLocale } from '../../i18n/LocaleContext'

export function Pagination({ page, totalPages, setFilters }) {
  const { t } = useLocale()
  if (!totalPages || totalPages <= 1) return null

  const currentPage = Math.min(Math.max(Number(page || 1), 1), totalPages)

  function goToPage(nextPage) {
    setFilters((current) => ({ ...current, page: Math.min(Math.max(nextPage, 1), totalPages) }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav className="pagination" aria-label={t('common.paginationLabel')}>
      <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
        {t('common.previous')}
      </button>
      <span>
        {currentPage} / {totalPages}
      </span>
      <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
        {t('common.next')}
      </button>
    </nav>
  )
}
