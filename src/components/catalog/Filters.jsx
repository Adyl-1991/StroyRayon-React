import { useEffect, useMemo, useState } from 'react'
import { BADGE_LABELS, STOCK_LABELS } from '../../services/productService'
import { defaultCatalogFilters } from './filterDefaults'

const stockOptions = [
  { value: 'in_stock', label: STOCK_LABELS.in_stock },
  { value: 'low_stock', label: STOCK_LABELS.low_stock },
  { value: 'pre_order', label: STOCK_LABELS.pre_order },
  { value: 'out_of_stock', label: STOCK_LABELS.out_of_stock },
]

const sortOptions = [
  { value: 'popular', label: 'Популярдуу' },
  { value: 'price-asc', label: 'Арзанынан кымбатына' },
  { value: 'price-desc', label: 'Кымбатынан арзанына' },
  { value: 'rating', label: 'Рейтинги жогору' },
  { value: 'sale', label: 'Акциядагылар' },
  { value: 'new', label: 'Жаңы товарлар' },
]

export function Filters({ filters, setFilters, options, resultCount }) {
  const [isOpen, setIsOpen] = useState(false)
  const safeOptions = {
    brands: options?.brands || [],
    tags: options?.tags || [],
    units: options?.units || [],
  }

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 940px)')
    const syncOpenState = () => setIsOpen(desktopQuery.matches)

    syncOpenState()
    desktopQuery.addEventListener('change', syncOpenState)

    return () => desktopQuery.removeEventListener('change', syncOpenState)
  }, [])

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

  const activeFilterLabels = useMemo(
    () =>
      [
        filters.minPrice && `Мин: ${filters.minPrice} сом`,
        filters.maxPrice && `Макс: ${filters.maxPrice} сом`,
        ...(filters.stockStatuses || []).map((value) => STOCK_LABELS[value]),
        ...(filters.brands || []).map((value) => getSelectedLabel(safeOptions.brands, value)),
        ...(filters.tags || []).map((value) => getSelectedLabel(safeOptions.tags, value) || BADGE_LABELS[value] || value),
        ...(filters.units || []).map((value) => getSelectedLabel(safeOptions.units, value)),
      ].filter(Boolean),
    [filters, safeOptions.brands, safeOptions.tags, safeOptions.units],
  )

  return (
    <details className="filters" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        <span>Фильтрлер</span>
        <strong>{resultCount} товар</strong>
      </summary>
      <div className="active-filters active-filters--summary" aria-live="polite">
        {activeFilterLabels.length ? activeFilterLabels.map((label) => <span key={label}>{label}</span>) : <span>Активдүү фильтр жок</span>}
      </div>
      <div className="filters__body">
        <div className="filter-group filter-group--price">
          <span>Баа диапазону</span>
          <label>
            Минимум
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={filters.minPrice}
              onChange={(event) => updateField('minPrice', event.target.value)}
            />
          </label>
          <label>
            Максимум
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
          <legend>Наличиеси</legend>
          {stockOptions.map((option) => (
            <label key={option.value}>
              <input
                type="checkbox"
                checked={filters.stockStatuses.includes(option.value)}
                onChange={() => toggleArrayValue('stockStatuses', option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="filter-group">
          <legend>Бренд</legend>
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

        <fieldset className="filter-group">
          <legend>Бейдж</legend>
          {safeOptions.tags.map((tag) => (
            <label key={getOptionValue(tag)}>
              <input type="checkbox" checked={filters.tags.includes(getOptionValue(tag))} onChange={() => toggleArrayValue('tags', getOptionValue(tag))} />
              {getOptionLabel(tag)}
            </label>
          ))}
        </fieldset>

        <fieldset className="filter-group">
          <legend>Бирдик</legend>
          {safeOptions.units.map((unit) => (
            <label key={getOptionValue(unit)}>
              <input type="checkbox" checked={filters.units.includes(getOptionValue(unit))} onChange={() => toggleArrayValue('units', getOptionValue(unit))} />
              {getOptionLabel(unit)}
            </label>
          ))}
        </fieldset>

        <label className="filter-group">
          Сорттоо
          <select value={filters.sort} onChange={(event) => updateField('sort', event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="active-filters active-filters--body" aria-live="polite">
          {activeFilterLabels.length ? activeFilterLabels.map((label) => <span key={label}>{label}</span>) : <span>Активдүү фильтр жок</span>}
        </div>

        <button className="text-button" type="button" onClick={clearFilters}>
          Фильтрди тазалоо
        </button>
      </div>
    </details>
  )
}

function getOptionValue(option) {
  return typeof option === 'object' ? option.value : option
}

function getOptionLabel(option) {
  if (typeof option !== 'object') return BADGE_LABELS[option] || option
  return option.count ? `${option.label} (${option.count})` : option.label
}

function getSelectedLabel(options, value) {
  const option = options.find((item) => getOptionValue(item) === value)
  return option ? getOptionLabel(option) : value
}
