import { useState } from 'react'
import { useLocale } from '../../i18n/LocaleContext'
import { getBadgeLabel, getStockLabel, getUnitLabel } from '../../services/productService'
import { defaultCatalogFilters } from './filterDefaults'

const stockOptions = [
  { value: 'in_stock' },
  { value: 'low_stock' },
  { value: 'pre_order' },
  { value: 'out_of_stock' },
]

const sortOptions = [
  { value: 'popular', labelKey: 'filters.sortOptions.popular' },
  { value: 'price-asc', labelKey: 'filters.sortOptions.priceAsc' },
  { value: 'price-desc', labelKey: 'filters.sortOptions.priceDesc' },
  { value: 'rating', labelKey: 'filters.sortOptions.rating' },
  { value: 'sale', labelKey: 'filters.sortOptions.sale' },
  { value: 'new', labelKey: 'filters.sortOptions.new' },
]

export function Filters({ filters, setFilters, options, resultCount, variant = 'inline', showActiveChips = true }) {
  const { locale, t } = useLocale()
  const [isOpen, setIsOpen] = useState(() => {
    if (variant !== 'sidebar') return false
    if (typeof window === 'undefined' || !window.matchMedia) return true

    return window.matchMedia('(min-width: 940px)').matches
  })
  const safeOptions = {
    brands: options?.brands || [],
    tags: options?.tags || [],
    units: options?.units || [],
  }

  function updateField(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  function toggleArrayValue(field, value) {
    setFilters((current) => {
      const values = current[field] || []
      return {
        ...current,
        [field]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      }
    })
  }

  function clearFilters() {
    setFilters(defaultCatalogFilters)
  }

  function closeFilters() {
    setIsOpen(false)
  }

  const activeFilterLabels = getActiveFilterLabels(filters, safeOptions, locale, t)
  const hasActiveFilters = activeFilterLabels.length > 0
  const hasBrands = safeOptions.brands.length > 0
  const hasTags = safeOptions.tags.length > 0
  const hasUnits = safeOptions.units.length > 1

  return (
    <details className={`filters filters--${variant}`} open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        <span>{hasActiveFilters ? t('filters.activeTitle', { count: activeFilterLabels.length }) : t('filters.title')}</span>
        <strong>{t('filters.resultCount', { count: resultCount })}</strong>
      </summary>
      {showActiveChips && <ActiveFilterChips labels={activeFilterLabels} className="active-filters--summary" />}
      <div className="filters__body">
        <div className="filter-group filter-group--price">
          <span>{t('filters.priceRange')}</span>
          <label>
            {t('filters.min')}
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={filters.minPrice}
              onChange={(event) => updateField('minPrice', event.target.value)}
            />
          </label>
          <label>
            {t('filters.max')}
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={filters.maxPrice}
              onChange={(event) => updateField('maxPrice', event.target.value)}
            />
          </label>
        </div>

        <fieldset className="filter-group">
          <legend>{t('filters.stock')}</legend>
          {stockOptions.map((option) => (
            <label key={option.value}>
              <input
                type="checkbox"
                checked={filters.stockStatuses.includes(option.value)}
                onChange={() => toggleArrayValue('stockStatuses', option.value)}
              />
              {getStockLabel(option.value, locale)}
            </label>
          ))}
        </fieldset>

        {hasBrands && (
          <fieldset className="filter-group filter-group--scroll">
            <legend>{t('filters.brand')}</legend>
            {safeOptions.brands.map((brand) => (
              <label key={getOptionValue(brand)}>
                <input
                  type="checkbox"
                  checked={filters.brands.includes(getOptionValue(brand))}
                  onChange={() => toggleArrayValue('brands', getOptionValue(brand))}
                />
                {getOptionLabel(brand)}
              </label>
            ))}
          </fieldset>
        )}

        {hasTags && (
          <fieldset className="filter-group filter-group--scroll">
            <legend>{t('filters.badges')}</legend>
            {safeOptions.tags.map((tag) => (
              <label key={getOptionValue(tag)}>
                <input type="checkbox" checked={filters.tags.includes(getOptionValue(tag))} onChange={() => toggleArrayValue('tags', getOptionValue(tag))} />
                {getOptionLabel(tag, locale)}
              </label>
            ))}
          </fieldset>
        )}

        {hasUnits && (
          <fieldset className="filter-group filter-group--scroll">
            <legend>{t('filters.unit')}</legend>
            {safeOptions.units.map((unit) => (
              <label key={getOptionValue(unit)}>
                <input type="checkbox" checked={filters.units.includes(getOptionValue(unit))} onChange={() => toggleArrayValue('units', getOptionValue(unit))} />
                {getOptionLabel(unit, locale, 'unit')}
              </label>
            ))}
          </fieldset>
        )}

        <label className="filter-group">
          {t('filters.sort')}
          <select value={filters.sort} onChange={(event) => updateField('sort', event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        {showActiveChips && <ActiveFilterChips labels={activeFilterLabels} className="active-filters--body" />}

        <div className="filters__actions">
          <button className="text-button" type="button" onClick={clearFilters}>
            {t('filters.clear')}
          </button>
          <button className="text-button" type="button" onClick={closeFilters}>
            {t('filters.close')}
          </button>
          <button className="button button--secondary" type="button" onClick={closeFilters}>
            {t('filters.showProducts', { count: resultCount })}
          </button>
        </div>

        <button className="text-button" type="button" onClick={clearFilters}>
          {t('filters.clearFilters')}
        </button>
      </div>
    </details>
  )
}

export function CatalogActiveFilters({ filters, options, className = '' }) {
  const { locale, t } = useLocale()
  const safeOptions = {
    brands: options?.brands || [],
    tags: options?.tags || [],
    units: options?.units || [],
  }
  const activeFilterLabels = getActiveFilterLabels(filters, safeOptions, locale, t)

  return <ActiveFilterChips labels={activeFilterLabels} className={className} />
}

function ActiveFilterChips({ labels, className = '' }) {
  if (!labels.length) return null

  return (
    <div className={`active-filters ${className}`.trim()} aria-live="polite">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  )
}

function getActiveFilterLabels(filters, options, locale, t) {
  return [
    filters.minPrice && t('filters.activeMin', { value: filters.minPrice }),
    filters.maxPrice && t('filters.activeMax', { value: filters.maxPrice }),
    ...(filters.stockStatuses || []).map((value) => getStockLabel(value, locale)),
    ...(filters.brands || []).map((value) => getSelectedLabel(options.brands, value)),
    ...(filters.tags || []).map((value) => getSelectedLabel(options.tags, value, locale) || getBadgeLabel(value, locale)),
    ...(filters.units || []).map((value) => getSelectedLabel(options.units, value, locale, 'unit')),
  ].filter(Boolean)
}

function getOptionValue(option) {
  return typeof option === 'object' ? option.value : option
}

function getOptionLabel(option, locale = 'kg', type = 'badge') {
  if (typeof option !== 'object') return type === 'unit' ? getUnitLabel(option, locale) : getBadgeLabel(option, locale)
  const label = type === 'unit' ? getUnitLabel(option.label, locale) : option.label
  return option.count ? `${label} (${option.count})` : label
}

function getSelectedLabel(options, value, locale = 'kg', type = 'badge') {
  const option = options.find((item) => getOptionValue(item) === value)
  if (option) return getOptionLabel(option, locale, type)
  return type === 'unit' ? getUnitLabel(value, locale) : value
}
