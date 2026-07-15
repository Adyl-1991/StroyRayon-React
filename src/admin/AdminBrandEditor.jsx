import { useMemo, useState } from 'react'
import { createAdminBrand, deleteAdminBrand, updateAdminBrand } from '../api/adminApi'

const sortBrands = (brands) =>
  [...brands].sort((left, right) => left.name.localeCompare(right.name, 'ru'))

export function AdminBrandEditor({ brands, value, onChange, onBrandsChange, disabled = false, selectQa = 'product-brand' }) {
  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === value) || null,
    [brands, value],
  )
  const productCount = selectedBrand?._count?.products || 0
  const [nameState, setNameState] = useState(() => ({
    brandId: value,
    name: selectedBrand?.name || '',
  }))
  const name = nameState.brandId === value ? nameState.name : selectedBrand?.name || ''
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('idle')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function handleSelect(brandId) {
    const nextBrand = brands.find((brand) => brand.id === brandId)
    setNameState({ brandId, name: nextBrand?.name || '' })
    setError('')
    setMessage('')
    setMode('idle')
    onChange(brandId)
  }

  function startCreate() {
    setNameState({ brandId: value, name: '' })
    setError('')
    setMessage('')
    setMode('create')
  }

  function startRename() {
    if (!selectedBrand) return
    setNameState({ brandId: value, name: selectedBrand.name })
    setError('')
    setMessage('')
    setMode('rename')
  }

  function cancelEditing() {
    setNameState({ brandId: value, name: selectedBrand?.name || '' })
    setError('')
    setMode('idle')
  }

  const applyBrands = (nextBrands) => onBrandsChange(sortBrands(nextBrands))

  async function handleCreate() {
    const nextName = name.trim()
    if (!nextName) return setError('Введите название нового бренда.')
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const created = await createAdminBrand(nextName)
      applyBrands([...brands, created])
      onChange(created.id)
      setNameState({ brandId: created.id, name: created.name })
      setMode('idle')
      setMessage(`Бренд «${created.name}» добавлен и выбран.`)
    } catch (requestError) {
      setError(requestError.message || 'Не удалось добавить бренд.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRename() {
    const nextName = name.trim()
    if (!selectedBrand || !nextName) return setError('Выберите бренд и введите новое название.')
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const updated = await updateAdminBrand(selectedBrand.id, nextName)
      applyBrands(brands.map((brand) => (brand.id === updated.id ? updated : brand)))
      setNameState({ brandId: updated.id, name: updated.name })
      setMode('idle')
      setMessage(`Название изменено на «${updated.name}».`)
    } catch (requestError) {
      setError(requestError.message || 'Не удалось переименовать бренд.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!selectedBrand || productCount > 0) return
    if (!window.confirm(`Удалить бренд «${selectedBrand.name}»?`)) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await deleteAdminBrand(selectedBrand.id)
      applyBrands(brands.filter((brand) => brand.id !== selectedBrand.id))
      onChange('')
      setNameState({ brandId: '', name: '' })
      setMessage('Бренд удалён.')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось удалить бренд.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='admin-brand-editor' data-qa='brand-editor'>
      <label>
        Бренд
        <select data-qa={selectQa} value={value} onChange={(event) => handleSelect(event.target.value)} disabled={disabled || busy}>
          <option value=''>Без бренда</option>
          {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
        </select>
      </label>
      {!disabled && (
        <div className='admin-brand-manager'>
          {mode !== 'idle' && (
            <label>
              {mode === 'create' ? 'Новый бренд' : 'Новое название бренда'}
              <input data-qa='brand-name' value={name} onChange={(event) => setNameState({ brandId: value, name: event.target.value })} maxLength={120} placeholder='Например, Bosch' disabled={busy} autoFocus />
            </label>
          )}
          <div className='admin-brand-actions'>
            {mode === 'idle' ? (
              <>
                <button type='button' className='admin-secondary-button' onClick={startCreate} disabled={busy}>Добавить бренд</button>
                <button type='button' className='admin-secondary-button' onClick={startRename} disabled={busy || !selectedBrand}>Переименовать</button>
                <button type='button' className='admin-danger-button' onClick={handleDelete} disabled={busy || !selectedBrand || productCount > 0}>Удалить</button>
              </>
            ) : (
              <>
                <button type='button' className='admin-secondary-button' onClick={mode === 'create' ? handleCreate : handleRename} disabled={busy || !name.trim() || (mode === 'rename' && name.trim() === selectedBrand?.name)}>Сохранить</button>
                <button type='button' className='admin-secondary-button' onClick={cancelEditing} disabled={busy}>Отмена</button>
              </>
            )}
          </div>
          {selectedBrand && productCount > 0 && <small>Бренд используется в товарах: {productCount}. Сначала смените бренд у этих товаров.</small>}
          {error && <small className='admin-inline-error' role='alert'>{error}</small>}
          {message && <small className='admin-inline-success' role='status'>{message}</small>}
        </div>
      )}
    </div>
  )
}
