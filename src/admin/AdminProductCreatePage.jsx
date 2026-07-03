import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { createAdminProduct, getAdminProductOptions, uploadAdminProductImage } from '../api/adminApi'
import { hasAdminPermission } from './adminPermissions'

const stockOptions = [
  ['IN_STOCK', 'В наличии'],
  ['LOW_STOCK', 'Мало'],
  ['PRE_ORDER', 'Предзаказ'],
  ['OUT_OF_STOCK', 'Нет в наличии'],
]

const documentTypeOptions = [
  ['CERTIFICATE', 'Сертификат'],
  ['MANUAL', 'Инструкция'],
  ['PASSPORT', 'Паспорт товара'],
  ['OTHER', 'Другое'],
]

function emptySpec() {
  return { key: '', value: '' }
}

function emptyDocument() {
  return { title: '', url: '', type: 'OTHER', sortOrder: 0 }
}

const cyrillicMap = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ы: 'y',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ң: 'n',
  ө: 'o',
  ү: 'u',
}

function slugify(value) {
  const transliterated = value
    .toLowerCase()
    .split('')
    .map((char) => cyrillicMap[char] || char)
    .join('')

  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
}

function createInitialForm() {
  const stamp = Date.now().toString().slice(-6)
  return {
    catalogNodeId: '',
    brandId: '',
    titleKg: '',
    titleRu: '',
    slug: `local-product-${stamp}`,
    sku: `SR-LOCAL-${stamp}`,
    shortDescriptionKg: '',
    descriptionKg: '',
    descriptionRu: '',
    seoTitleKg: '',
    seoDescriptionKg: '',
    seoTitleRu: '',
    seoDescriptionRu: '',
    price: '100',
    stockQuantity: '1',
    unit: 'даана',
    stockStatus: 'IN_STOCK',
    isActive: true,
    adminNote: '',
    imageSrc: '',
    imageAlt: '',
    specs: [emptySpec()],
    documents: [emptyDocument()],
    images: [],
  }
}

function compactRows(rows, fields) {
  return rows
    .map((row, index) => ({ ...row, sortOrder: row.sortOrder ?? index }))
    .filter((row) => fields.some((field) => String(row[field] || '').trim()))
}

function compactSpecs(rows) {
  return rows
    .map((row) => ({ key: row.key, value: row.value }))
    .filter((row) => row.key.trim() || row.value.trim())
}

export function AdminProductCreatePage() {
  const navigate = useNavigate()
  const { admin } = useOutletContext()
  const [options, setOptions] = useState(null)
  const [form, setForm] = useState(createInitialForm)
  const [slugTouched, setSlugTouched] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadMessage, setImageUploadMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAdminProductOptions()
      .then((data) => {
        if (!active) return
        setOptions(data)
        setForm((current) => ({
          ...current,
          catalogNodeId: current.catalogNodeId || data.categories[0]?.id || '',
          unit: data.units.includes(current.unit) ? current.unit : data.units[0] || current.unit,
        }))
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Не удалось загрузить справочники товара.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const categoryOptions = useMemo(() => options?.categories || [], [options])
  const brands = useMemo(() => options?.brands || [], [options])
  const units = useMemo(() => options?.units || ['даана', 'метр', 'кг'], [options])
  const canCreate = hasAdminPermission(admin, 'products:create')
  const canUpload = hasAdminPermission(admin, 'products:upload')

  function updateField(name, value) {
    setForm((current) => {
      const next = { ...current, [name]: value }
      if ((name === 'titleKg' || name === 'titleRu') && !slugTouched) {
        const nextSlug = slugify(next.titleRu || next.titleKg)
        if (nextSlug) next.slug = nextSlug
      }
      if (name === 'imageSrc') {
        next.images = value
          ? [
              {
                ...(current.images[0] || {}),
                src: value,
                alt: current.imageAlt || current.titleRu || current.titleKg,
                type: 'MAIN',
                sortOrder: 0,
              },
              ...current.images.slice(1),
            ]
          : current.images
      }
      if (name === 'imageAlt' && current.images.length) {
        next.images = current.images.map((image, index) =>
          index === 0 ? { ...image, alt: value } : image,
        )
      }
      return next
    })
  }

  function updateRow(group, index, name, value) {
    setForm((current) => ({
      ...current,
      [group]: current[group].map((row, rowIndex) =>
        rowIndex === index ? { ...row, [name]: value } : row,
      ),
    }))
  }

  function addRow(group, row) {
    setForm((current) => ({ ...current, [group]: [...current[group], row] }))
  }

  function removeRow(group, index, fallback) {
    setForm((current) => {
      const nextRows = current[group].filter((_, rowIndex) => rowIndex !== index)
      return { ...current, [group]: nextRows.length ? nextRows : [fallback] }
    })
  }

  function removeImage(index) {
    setForm((current) => {
      const nextImages = current.images.filter((_, imageIndex) => imageIndex !== index)
      const mainImage = nextImages[0]
      return {
        ...current,
        images: nextImages.map((image, imageIndex) => ({
          ...image,
          type: imageIndex === 0 ? 'MAIN' : 'GALLERY',
          sortOrder: imageIndex,
        })),
        imageSrc: mainImage?.src || '',
        imageAlt: mainImage?.alt || '',
      }
    })
  }

  async function handleImageFileChange(event) {
    if (!canUpload) {
      setError('Недостаточно прав для загрузки фото.')
      event.target.value = ''
      return
    }
    const file = event.target.files?.[0]
    setImageUploadMessage('')
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Выберите файл изображения.')
      event.target.value = ''
      return
    }

    setError('')
    setUploadingImage(true)
    try {
      const uploaded = await uploadAdminProductImage(file)
      const nextAlt = form.imageAlt.trim() || form.titleRu || form.titleKg || file.name.replace(/\.[^.]+$/, '')
      setForm((current) => ({
        ...current,
        imageSrc: uploaded.src,
        imageAlt: current.imageAlt.trim() || nextAlt,
        images: [
          ...current.images,
          {
            src: uploaded.src,
            alt: current.imageAlt.trim() || nextAlt,
            type: current.images.length ? 'GALLERY' : 'MAIN',
            sortOrder: current.images.length,
          },
        ],
      }))
      setImageUploadMessage('Фото загружено. URL уже добавлен в форму.')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось загрузить фото.')
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }

  async function submitForm(event) {
    event.preventDefault()
    setError('')
    if (!canCreate) {
      setError('Недостаточно прав для создания товара.')
      return
    }

    const price = Number(form.price)
    const stockQuantity = Number(form.stockQuantity)
    if (!form.catalogNodeId) {
      setError('Выберите категорию.')
      return
    }
    if (!form.titleKg.trim() || !form.titleRu.trim()) {
      setError('Заполните название на кыргызском и русском.')
      return
    }
    if (!form.slug.trim()) {
      setError('Заполните slug.')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Цена должна быть положительным числом.')
      return
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setError('Остаток должен быть целым неотрицательным числом.')
      return
    }
    if (
      form.imageSrc.trim() &&
      !form.imageSrc.trim().startsWith('/images/') &&
      !form.imageSrc.trim().startsWith('/uploads/') &&
      !/^https?:\/\/.+/i.test(form.imageSrc.trim())
    ) {
      setError('Фото URL должен начинаться с https://, http://, /images/ или /uploads/.')
      return
    }

    setSaving(true)
    try {
      const images = form.images.length
        ? form.images
        : form.imageSrc.trim()
          ? [{ src: form.imageSrc.trim(), alt: form.imageAlt.trim(), type: 'MAIN', sortOrder: 0 }]
          : []
      const created = await createAdminProduct({
        ...form,
        brandId: form.brandId || null,
        price,
        stockQuantity,
        specs: compactSpecs(form.specs),
        documents: compactRows(form.documents, ['title', 'url']),
        images,
      })
      navigate(`/admin/products/${created.id}`)
    } catch (requestError) {
      setError(requestError.message || 'Не удалось создать товар.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="admin-state">Загружаем форму товара…</div>

  return (
    <section>
      <Link className="admin-back-link" to="/admin/products">← К списку товаров</Link>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Новый товар</span>
          <h1>Создать товар</h1>
          <p>Карточка сохраняется в локальную базу и сразу готова к проверке витрины.</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {!canCreate && (
        <div className="admin-alert admin-alert-error" role="status">
          У вашей роли нет права создавать товары.
        </div>
      )}

      <form className="admin-create-form" data-qa="admin-product-create-form" onSubmit={submitForm}>
        <div className="admin-detail-grid">
          <article className="admin-card admin-edit-form">
            <h2>Каталог</h2>
            <label>
              Категория
              <select
                data-qa="product-category"
                value={form.catalogNodeId}
                onChange={(event) => updateField('catalogNodeId', event.target.value)}
                required
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {'— '.repeat(Math.max(category.level || 0, 0))}{category.titleKg} · {category.path}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Бренд
              <select
                data-qa="product-brand"
                value={form.brandId}
                onChange={(event) => updateField('brandId', event.target.value)}
              >
                <option value="">Без бренда</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </label>
            <label>
              Slug
              <input
                data-qa="product-slug"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  updateField('slug', event.target.value)
                }}
                maxLength={180}
                required
              />
            </label>
            <label>
              SKU
              <input
                data-qa="product-sku"
                value={form.sku}
                onChange={(event) => updateField('sku', event.target.value)}
                maxLength={80}
              />
            </label>
            <label>
              Фото URL
              <input
                data-qa="product-image-src"
                value={form.imageSrc}
                onChange={(event) => updateField('imageSrc', event.target.value)}
                maxLength={500}
                placeholder="/images/products/example/main.webp"
              />
            </label>
            <label className="admin-file-upload">
              Загрузить фото с компьютера
              <input
                data-qa="product-image-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={uploadingImage || !canUpload || !canCreate}
                onChange={handleImageFileChange}
              />
              <span>{uploadingImage ? 'Загружаем фото...' : 'JPG, PNG, WEBP или GIF до 5 MB'}</span>
            </label>
            {imageUploadMessage && <small className="admin-upload-status">{imageUploadMessage}</small>}
            {form.imageSrc && (
              <div className="admin-image-preview">
                <img src={form.imageSrc} alt={form.imageAlt || 'Превью фото товара'} />
              </div>
            )}
            <label>
              Alt для фото
              <input
                data-qa="product-image-alt"
                value={form.imageAlt}
                onChange={(event) => updateField('imageAlt', event.target.value)}
                maxLength={180}
              />
            </label>
            {form.images.length > 0 && (
              <div className="admin-gallery-editor admin-gallery-editor-compact">
                {form.images.map((image, index) => (
                  <div className="admin-gallery-item" key={`${image.src}-${index}`}>
                    <img src={image.src} alt={image.alt || form.titleKg || 'Фото товара'} />
                    <small>{index === 0 ? 'Главное фото' : 'Галерея'}</small>
                    <button type="button" className="admin-danger-button" onClick={() => removeImage(index)}>
                      Убрать
                    </button>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="admin-card admin-edit-form">
            <h2>Цена и остаток</h2>
            <label>
              Цена, KGS
              <input
                data-qa="product-price"
                type="number"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                value={form.price}
                onChange={(event) => updateField('price', event.target.value)}
                required
              />
            </label>
            <label>
              Остаток
              <input
                data-qa="product-stock"
                type="number"
                min="0"
                step="1"
                value={form.stockQuantity}
                onChange={(event) => updateField('stockQuantity', event.target.value)}
                required
              />
            </label>
            <label>
              Единица
              <select
                data-qa="product-unit"
                value={form.unit}
                onChange={(event) => updateField('unit', event.target.value)}
              >
                {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label>
              Статус наличия
              <select
                data-qa="product-stock-status"
                value={form.stockStatus}
                onChange={(event) => updateField('stockStatus', event.target.value)}
              >
                {stockOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="admin-checkbox-field">
              <input
                data-qa="product-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateField('isActive', event.target.checked)}
              />
              Показывать товар в магазине
            </label>
          </article>
        </div>

        <div className="admin-detail-grid">
          <article className="admin-card admin-edit-form">
            <h2>Текст KG</h2>
            <label>
              Название KG
              <input
                data-qa="product-title-kg"
                value={form.titleKg}
                onChange={(event) => updateField('titleKg', event.target.value)}
                maxLength={180}
                required
              />
            </label>
            <label>
              Короткое описание KG
              <textarea
                data-qa="product-short-description-kg"
                rows={3}
                value={form.shortDescriptionKg}
                onChange={(event) => updateField('shortDescriptionKg', event.target.value)}
                maxLength={1200}
              />
            </label>
            <label>
              Описание KG
              <textarea
                data-qa="product-description-kg"
                rows={7}
                value={form.descriptionKg}
                onChange={(event) => updateField('descriptionKg', event.target.value)}
                maxLength={5000}
              />
            </label>
          </article>

          <article className="admin-card admin-edit-form">
            <h2>Текст RU</h2>
            <label>
              Название RU
              <input
                data-qa="product-title-ru"
                value={form.titleRu}
                onChange={(event) => updateField('titleRu', event.target.value)}
                maxLength={180}
                required
              />
            </label>
            <label>
              Описание RU
              <textarea
                data-qa="product-description-ru"
                rows={7}
                value={form.descriptionRu}
                onChange={(event) => updateField('descriptionRu', event.target.value)}
                maxLength={5000}
              />
            </label>
            <label>
              Внутренняя заметка
              <textarea
                data-qa="product-admin-note"
                rows={4}
                value={form.adminNote}
                onChange={(event) => updateField('adminNote', event.target.value)}
                maxLength={2000}
              />
            </label>
          </article>
        </div>

        <article className="admin-card admin-edit-form">
          <div className="admin-section-header">
            <h2>Характеристики</h2>
            <button type="button" className="admin-secondary-button" onClick={() => addRow('specs', emptySpec())}>
              Добавить характеристику
            </button>
          </div>
          <div className="admin-repeat-list">
            {form.specs.map((row, index) => (
              <div className="admin-repeat-row admin-repeat-row-spec" key={`create-spec-${index}`}>
                <input data-qa="product-spec-key" placeholder="Ключ" value={row.key} onChange={(event) => updateRow('specs', index, 'key', event.target.value)} maxLength={120} />
                <input data-qa="product-spec-value" placeholder="Значение" value={row.value} onChange={(event) => updateRow('specs', index, 'value', event.target.value)} maxLength={500} />
                <button type="button" className="admin-danger-button" onClick={() => removeRow('specs', index, emptySpec())}>Удалить</button>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card admin-edit-form">
          <div className="admin-section-header">
            <h2>Документы</h2>
            <button type="button" className="admin-secondary-button" onClick={() => addRow('documents', emptyDocument())}>
              Добавить документ
            </button>
          </div>
          <div className="admin-repeat-list">
            {form.documents.map((row, index) => (
              <div className="admin-repeat-row admin-repeat-row-document" key={`create-document-${index}`}>
                <input data-qa="product-document-title" placeholder="Название" value={row.title} onChange={(event) => updateRow('documents', index, 'title', event.target.value)} maxLength={180} />
                <input data-qa="product-document-url" placeholder="https://... или /uploads/..." value={row.url} onChange={(event) => updateRow('documents', index, 'url', event.target.value)} maxLength={500} />
                <select data-qa="product-document-type" value={row.type} onChange={(event) => updateRow('documents', index, 'type', event.target.value)}>
                  {documentTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" className="admin-danger-button" onClick={() => removeRow('documents', index, emptyDocument())}>Удалить</button>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card admin-edit-form">
          <h2>SEO</h2>
          <div className="admin-detail-grid admin-detail-grid-compact">
            <label>
              SEO title KG
              <input data-qa="product-seo-title-kg" value={form.seoTitleKg} onChange={(event) => updateField('seoTitleKg', event.target.value)} maxLength={180} />
            </label>
            <label>
              SEO title RU
              <input data-qa="product-seo-title-ru" value={form.seoTitleRu} onChange={(event) => updateField('seoTitleRu', event.target.value)} maxLength={180} />
            </label>
            <label>
              SEO meta KG
              <textarea data-qa="product-seo-description-kg" rows={3} value={form.seoDescriptionKg} onChange={(event) => updateField('seoDescriptionKg', event.target.value)} maxLength={500} />
            </label>
            <label>
              SEO meta RU
              <textarea data-qa="product-seo-description-ru" rows={3} value={form.seoDescriptionRu} onChange={(event) => updateField('seoDescriptionRu', event.target.value)} maxLength={500} />
            </label>
          </div>
        </article>

        <div className="admin-create-actions">
          <button className="admin-primary-button" type="submit" disabled={saving || !canCreate}>
            {saving ? 'Создаём…' : 'Создать товар'}
          </button>
        </div>
      </form>
    </section>
  )
}
