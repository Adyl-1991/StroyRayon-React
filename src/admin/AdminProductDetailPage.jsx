import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import {
  createAdminProductVariant,
  deleteAdminProductImage,
  discardAdminProductDraft,
  getAdminProduct,
  getAdminProductDraft,
  getAdminProductAuditLog,
  getAdminProductOptions,
  publishAdminProductDraft,
  reorderAdminProductImages,
  saveAdminProductDraft,
  updateAdminProductImage,
  updateAdminProductVariant,
  uploadAdminProductGalleryImage,
} from '../api/adminApi'
import { formatPrice } from '../utils/formatPrice'
import { AdminBrandEditor } from './AdminBrandEditor'
import { hasAdminPermission } from './adminPermissions'

const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024

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

const auditActionLabels = {
  product_created: 'Товар создан',
  product_updated: 'Товар обновлен',
  price_changed: 'Цена изменена',
  stock_changed: 'Остаток изменен',
  active_changed: 'Видимость изменена',
  note_changed: 'Заметка изменена',
}

function formatAuditValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (Array.isArray(value)) return `${value.length} строк`
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 140)
  return String(value)
}

function auditFieldValue(snapshot, field) {
  if (!snapshot || typeof snapshot !== 'object') return undefined
  if (field === 'stock') return snapshot.stockQuantity
  if (field === 'description') return snapshot.descriptionKg || snapshot.descriptionRu || snapshot.shortDescriptionKg
  if (field === 'seo') return snapshot.seoTitleKg || snapshot.seoTitleRu || snapshot.seoDescriptionKg || snapshot.seoDescriptionRu
  return snapshot[field]
}

function emptySpec() {
  return { key: '', value: '' }
}

function emptyFaq() {
  return { question: '', answer: '' }
}

function emptyDocument() {
  return { title: '', url: '', type: 'OTHER', sortOrder: 0 }
}

function emptyVariant(index = 0, product = {}) {
  return {
    id: '',
    titleKg: '',
    titleRu: '',
    sku: '',
    price: String(product.price || ''),
    unit: product.unit || '',
    stockQuantity: '0',
    stockStatus: 'IN_STOCK',
    isActive: true,
    sortOrder: index,
    specs: [emptySpec()],
    isNew: true,
  }
}

function specsToRows(specs = {}) {
  return Object.entries(specs || {}).map(([key, value]) => ({ key, value: String(value ?? '') }))
}

function faqToRows(faq = []) {
  if (!Array.isArray(faq)) return []
  return faq.map((item) => ({
    question: String(item?.question ?? ''),
    answer: String(item?.answer ?? ''),
  }))
}

function createForm(product) {
  const specs = specsToRows(product.specs)
  const specsRu = specsToRows(product.specsRu)
  const faqKg = faqToRows(product.faqKg)
  const faqRu = faqToRows(product.faqRu)
  return {
    catalogNodeId: product.category?.id || '',
    brandId: product.brand?.id || '',
    titleKg: product.title || '',
    titleRu: product.titleRu || '',
    slug: product.slug || '',
    sku: product.sku || '',
    shortDescriptionKg: product.shortDescriptionKg || '',
    shortDescriptionRu: product.shortDescriptionRu || '',
    descriptionKg: product.descriptionKg || '',
    descriptionRu: product.descriptionRu || '',
    seoTitleKg: product.seoTitleKg || '',
    seoDescriptionKg: product.seoDescriptionKg || '',
    seoTitleRu: product.seoTitleRu || '',
    seoDescriptionRu: product.seoDescriptionRu || '',
    price: String(product.price || ''),
    quantity: String(product.stock?.quantity ?? 0),
    stockStatus: product.stockStatus?.toUpperCase() || 'IN_STOCK',
    unit: product.unit || '',
    unitRu: product.unitRu || '',
    minOrder: product.minOrder || '',
    minOrderRu: product.minOrderRu || '',
    packageInfoKg: product.packageInfoKg || '',
    packageInfoRu: product.packageInfoRu || '',
    isActive: Boolean(product.isActive),
    adminNote: product.adminNote || '',
    specs: specs.length ? specs : [emptySpec()],
    specsRu: specsRu.length ? specsRu : [emptySpec()],
    faqKg: faqKg.length ? faqKg : [emptyFaq()],
    faqRu: faqRu.length ? faqRu : [emptyFaq()],
    documents: product.documents?.length
      ? product.documents.map((document, index) => ({
          id: document.id,
          title: document.title || '',
          url: document.url || '',
          type: document.type || 'OTHER',
          sortOrder: document.sortOrder ?? index,
        }))
      : [emptyDocument()],
    images: product.images?.length
      ? product.images.map((image, index) => ({
          id: image.id,
          src: image.src || '',
          alt: image.alt || '',
          type: index === 0 ? 'MAIN' : 'GALLERY',
          sortOrder: image.sortOrder ?? index,
          storageKey: image.storageKey || '',
          storageDriver: image.storageDriver || 'legacy',
          originalName: image.originalName || '',
          size: image.size || 0,
        }))
      : [],
    variants: product.variants?.length
      ? product.variants.map((variant, index) => ({
          id: variant.id,
          titleKg: variant.titleKg || variant.size || '',
          titleRu: variant.titleRu || '',
          sku: variant.sku || '',
          price: String(variant.price ?? ''),
          unit: variant.unit || product.unit || '',
          stockQuantity: String(variant.stockQuantity ?? 0),
          reservedQuantity: variant.reservedQuantity || 0,
          stockStatus: variant.stockStatus?.toUpperCase() || 'IN_STOCK',
          isActive: Boolean(variant.isActive),
          sortOrder: variant.sortOrder ?? index,
          specs: specsToRows(variant.specs).length ? specsToRows(variant.specs) : [emptySpec()],
          isNew: false,
        }))
      : [],
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

function compactFaq(rows) {
  return rows
    .map((row) => ({ question: row.question, answer: row.answer }))
    .filter((row) => row.question.trim() || row.answer.trim())
}

function applyDraftToForm(product, draft) {
  const next = createForm(product)
  const payload = draft?.payload
  if (!payload || typeof payload !== 'object') return next
  for (const field of [
    'catalogNodeId', 'brandId', 'titleKg', 'titleRu', 'slug', 'sku',
    'shortDescriptionKg', 'shortDescriptionRu', 'descriptionKg', 'descriptionRu',
    'seoTitleKg', 'seoDescriptionKg', 'seoTitleRu', 'seoDescriptionRu', 'unit',
    'unitRu', 'minOrder', 'minOrderRu', 'packageInfoKg', 'packageInfoRu',
    'isActive', 'adminNote', 'stockStatus',
  ]) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) next[field] = payload[field] ?? ''
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'price')) next.price = String(payload.price ?? '')
  if (Object.prototype.hasOwnProperty.call(payload, 'stockQuantity')) next.quantity = String(payload.stockQuantity ?? '')
  if (Array.isArray(payload.specs)) next.specs = payload.specs.length ? payload.specs : [emptySpec()]
  if (Array.isArray(payload.specsRu)) next.specsRu = payload.specsRu.length ? payload.specsRu : [emptySpec()]
  if (Array.isArray(payload.faqKg)) next.faqKg = payload.faqKg.length ? payload.faqKg : [emptyFaq()]
  if (Array.isArray(payload.faqRu)) next.faqRu = payload.faqRu.length ? payload.faqRu : [emptyFaq()]
  if (Array.isArray(payload.documents)) next.documents = payload.documents.length ? payload.documents : [emptyDocument()]
  return next
}

function buildDraftPayload(form, permissions) {
  return {
    ...(permissions.content
      ? {
          catalogNodeId: form.catalogNodeId,
          brandId: form.brandId || null,
          titleKg: form.titleKg,
          titleRu: form.titleRu,
          slug: form.slug,
          sku: form.sku,
          shortDescriptionKg: form.shortDescriptionKg,
          shortDescriptionRu: form.shortDescriptionRu,
          descriptionKg: form.descriptionKg,
          descriptionRu: form.descriptionRu,
          seoTitleKg: form.seoTitleKg,
          seoDescriptionKg: form.seoDescriptionKg,
          seoTitleRu: form.seoTitleRu,
          seoDescriptionRu: form.seoDescriptionRu,
          unit: form.unit,
          unitRu: form.unitRu,
          minOrder: form.minOrder,
          minOrderRu: form.minOrderRu,
          packageInfoKg: form.packageInfoKg,
          packageInfoRu: form.packageInfoRu,
          adminNote: form.adminNote,
          specs: compactSpecs(form.specs),
          specsRu: compactSpecs(form.specsRu),
          faqKg: compactFaq(form.faqKg),
          faqRu: compactFaq(form.faqRu),
          documents: compactRows(form.documents, ['title', 'url']),
        }
      : {}),
    ...(permissions.commercial
      ? { price: form.price, stockQuantity: form.quantity, stockStatus: form.stockStatus }
      : {}),
    ...(permissions.active ? { isActive: form.isActive } : {}),
  }
}

function draftFingerprint(payload) {
  return JSON.stringify(payload)
}

export function AdminProductDetailPage() {
  const { id } = useParams()
  const { admin } = useOutletContext()
  const [product, setProduct] = useState(null)
  const [options, setOptions] = useState(null)
  const [form, setForm] = useState(null)
  const [auditLog, setAuditLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadError, setImageUploadError] = useState('')
  const [galleryBusy, setGalleryBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [draft, setDraft] = useState(null)
  const [draftStatus, setDraftStatus] = useState('idle')
  const [draftServiceReady, setDraftServiceReady] = useState(false)
  const draftVersionRef = useRef(0)
  const savedDraftFingerprintRef = useRef('')
  const latestDraftFingerprintRef = useRef('')
  const draftReadyRef = useRef(false)
  const saveDraftQueueRef = useRef(Promise.resolve())
  const publishingRef = useRef(false)

  useEffect(() => {
    let active = true
    draftReadyRef.current = false
    Promise.all([
      getAdminProduct(id),
      getAdminProductOptions(),
      getAdminProductAuditLog(id, { limit: 20 }),
      getAdminProductDraft(id).catch((requestError) => ({
        loadError: requestError.message || 'Сервис черновиков временно недоступен.',
      })),
    ])
      .then(([productData, optionsData, auditData, draftData]) => {
        if (!active) return
        const draftLoadError = draftData?.loadError
        const loadedDraft = draftLoadError ? null : draftData
        const nextForm = applyDraftToForm(productData, loadedDraft)
        const permissions = {
          content: hasAdminPermission(admin, 'products:content'),
          commercial: hasAdminPermission(admin, 'products:commercial'),
          active: hasAdminPermission(admin, 'products:active'),
        }
        const fingerprint = draftFingerprint(buildDraftPayload(nextForm, permissions))
        setProduct(productData)
        setOptions(optionsData)
        setAuditLog(auditData)
        setDraft(loadedDraft)
        setForm(nextForm)
        draftVersionRef.current = loadedDraft?.version || 0
        savedDraftFingerprintRef.current = fingerprint
        latestDraftFingerprintRef.current = fingerprint
        draftReadyRef.current = !draftLoadError
        setDraftServiceReady(!draftLoadError)
        setDraftStatus(draftLoadError ? 'error' : loadedDraft ? 'saved' : 'idle')
        if (draftLoadError) setError(`${draftLoadError} Редактор загружен, но публикация временно отключена.`)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Не удалось загрузить товар.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, admin])

  const units = useMemo(() => options?.units || ['даана', 'метр', 'кг'], [options])
  const categories = useMemo(() => options?.categories || [], [options])
  const brands = useMemo(() => options?.brands || [], [options])
  const canEditContent = hasAdminPermission(admin, 'products:content')
  const canEditCommercial = hasAdminPermission(admin, 'products:commercial')
  const canEditActive = hasAdminPermission(admin, 'products:active')
  const canUpload = hasAdminPermission(admin, 'products:upload')
  const canSave = canEditContent || canEditCommercial || canEditActive

  function updateBrands(brands) {
    setOptions((current) => ({ ...current, brands }))
  }

  useEffect(() => {
    if (!draftReadyRef.current || !form || !canSave) return undefined
    const payload = buildDraftPayload(form, {
      content: canEditContent,
      commercial: canEditCommercial,
      active: canEditActive,
    })
    const fingerprint = draftFingerprint(payload)
    latestDraftFingerprintRef.current = fingerprint
    if (fingerprint === savedDraftFingerprintRef.current) return undefined

    setDraftStatus('dirty')
    const timer = window.setTimeout(() => {
      if (publishingRef.current) return
      setDraftStatus('saving')
      saveDraftQueueRef.current = saveDraftQueueRef.current
        .catch(() => undefined)
        .then(() => saveAdminProductDraft(id, payload, draftVersionRef.current))
        .then((savedDraft) => {
          draftVersionRef.current = savedDraft.version
          savedDraftFingerprintRef.current = fingerprint
          setDraft(savedDraft)
          setDraftStatus(latestDraftFingerprintRef.current === fingerprint ? 'saved' : 'dirty')
          setError('')
        })
        .catch((requestError) => {
          setDraftStatus('error')
          setError(requestError.message || 'Не удалось автоматически сохранить черновик.')
        })
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [form, id, canSave, canEditContent, canEditCommercial, canEditActive])

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!['dirty', 'saving', 'error'].includes(draftStatus)) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [draftStatus])

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
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

  function mergeOperationalProduct(updatedProduct) {
    const freshForm = createForm(updatedProduct)
    setProduct(updatedProduct)
    setForm((current) => ({
      ...current,
      images: freshForm.images,
      variants: freshForm.variants,
    }))
  }

  async function handleImageUpload(event) {
    setImageUploadError('')
    if (!canUpload) {
      const uploadError = 'Недостаточно прав для загрузки фото.'
      setError(uploadError)
      setImageUploadError(uploadError)
      event.target.value = ''
      return
    }
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      const uploadError = 'Выберите JPG, PNG или WEBP файл.'
      setError(uploadError)
      setImageUploadError(uploadError)
      event.target.value = ''
      return
    }
    if (files.some((file) => file.size > MAX_PRODUCT_IMAGE_SIZE)) {
      const uploadError = 'Размер каждого изображения не должен превышать 5 MB.'
      setError(uploadError)
      setImageUploadError(uploadError)
      event.target.value = ''
      return
    }

    setUploadingImage(true)
    setError('')
    setMessage('')
    try {
      for (const file of files) {
        await uploadAdminProductGalleryImage(id, file)
      }
      const [updatedProduct, updatedAudit] = await Promise.all([
        getAdminProduct(id),
        getAdminProductAuditLog(id, { limit: 20 }),
      ])
      mergeOperationalProduct(updatedProduct)
      setAuditLog(updatedAudit)
      setMessage(files.length > 1 ? 'Фото загружены и прикреплены к товару.' : 'Фото загружено и прикреплено к товару.')
    } catch (requestError) {
      const status = requestError.status ? ` (${requestError.status})` : ''
      const uploadError = `${requestError.message || 'Не удалось загрузить фото.'}${status}`
      setError(uploadError)
      setImageUploadError(uploadError)
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }

  async function saveImageMeta(index) {
    const image = form.images[index]
    if (!image?.id) return
    setGalleryBusy(true)
    setError('')
    setMessage('')
    try {
      await updateAdminProductImage(id, image.id, { alt: image.alt })
      const [updatedProduct, updatedAudit] = await Promise.all([
        getAdminProduct(id),
        getAdminProductAuditLog(id, { limit: 20 }),
      ])
      mergeOperationalProduct(updatedProduct)
      setAuditLog(updatedAudit)
      setMessage('Данные фото сохранены.')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось сохранить фото.')
    } finally {
      setGalleryBusy(false)
    }
  }

  async function makeMainImage(index) {
    const image = form.images[index]
    if (!image?.id) return
    setGalleryBusy(true)
    setError('')
    setMessage('')
    try {
      await updateAdminProductImage(id, image.id, { isMain: true })
      const [updatedProduct, updatedAudit] = await Promise.all([
        getAdminProduct(id),
        getAdminProductAuditLog(id, { limit: 20 }),
      ])
      mergeOperationalProduct(updatedProduct)
      setAuditLog(updatedAudit)
      setMessage('Главное фото обновлено.')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось назначить главное фото.')
    } finally {
      setGalleryBusy(false)
    }
  }

  async function moveImage(index, direction) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= form.images.length) return
    const images = [...form.images]
    const [selected] = images.splice(index, 1)
    images.splice(nextIndex, 0, selected)
    setGalleryBusy(true)
    setError('')
    setMessage('')
    try {
      await reorderAdminProductImages(id, {
        images: images.map((image, imageIndex) => ({ id: image.id, sortOrder: imageIndex })),
        mainImageId: images[0]?.id,
      })
      const [updatedProduct, updatedAudit] = await Promise.all([
        getAdminProduct(id),
        getAdminProductAuditLog(id, { limit: 20 }),
      ])
      mergeOperationalProduct(updatedProduct)
      setAuditLog(updatedAudit)
      setMessage('Порядок фото обновлен.')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось изменить порядок фото.')
    } finally {
      setGalleryBusy(false)
    }
  }

  async function removeImage(index) {
    const image = form.images[index]
    if (!image?.id) return
    setGalleryBusy(true)
    setError('')
    setMessage('')
    try {
      await deleteAdminProductImage(id, image.id)
      const [updatedProduct, updatedAudit] = await Promise.all([
        getAdminProduct(id),
        getAdminProductAuditLog(id, { limit: 20 }),
      ])
      mergeOperationalProduct(updatedProduct)
      setAuditLog(updatedAudit)
      setMessage('Фото откреплено от товара.')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось убрать фото.')
    } finally {
      setGalleryBusy(false)
    }
  }
  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [...current.variants, emptyVariant(current.variants.length, current)],
    }))
  }

  function updateVariantField(index, name, value) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [name]: value } : variant,
      ),
    }))
  }

  function updateVariantSpec(index, specIndex, name, value) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              specs: variant.specs.map((spec, currentSpecIndex) =>
                currentSpecIndex === specIndex ? { ...spec, [name]: value } : spec,
              ),
            }
          : variant,
      ),
    }))
  }

  function addVariantSpec(index) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, specs: [...variant.specs, emptySpec()] } : variant,
      ),
    }))
  }

  function removeVariantSpec(index, specIndex) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) return variant
        const specs = variant.specs.filter((_, currentSpecIndex) => currentSpecIndex !== specIndex)
        return { ...variant, specs: specs.length ? specs : [emptySpec()] }
      }),
    }))
  }

  async function saveVariant(index, forceActive) {
    const variant = form.variants[index]
    if (!variant) return
    if (!canEditContent && !canEditCommercial && !canEditActive) {
      setError('Недостаточно прав для изменения варианта.')
      return
    }
    const price = Number(variant.price)
    const stockQuantity = Number(variant.stockQuantity)
    if (!variant.titleKg.trim()) {
      setError('Заполните название варианта KG.')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Цена варианта должна быть положительным числом.')
      return
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setError('Остаток варианта должен быть целым неотрицательным числом.')
      return
    }
    if (variant.reservedQuantity && stockQuantity < variant.reservedQuantity) {
      setError(`Остаток варианта не может быть меньше резерва (${variant.reservedQuantity}).`)
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    const payload = {
      ...(canEditContent
        ? {
            titleKg: variant.titleKg,
            titleRu: variant.titleRu,
            sku: variant.sku || null,
            unit: variant.unit,
            sortOrder: Number(variant.sortOrder) || 0,
            specs: compactSpecs(variant.specs),
          }
        : {}),
      ...(canEditCommercial
        ? {
            price,
            stockQuantity,
            stockStatus: variant.stockStatus,
          }
        : {}),
      ...(canEditActive ? { isActive: forceActive ?? variant.isActive } : {}),
    }

    try {
      if (variant.isNew) {
        await createAdminProductVariant(id, {
          titleKg: variant.titleKg,
          titleRu: variant.titleRu,
          sku: variant.sku || null,
          price,
          unit: variant.unit,
          stockQuantity,
          stockStatus: variant.stockStatus,
          isActive: forceActive ?? variant.isActive,
          sortOrder: Number(variant.sortOrder) || 0,
          specs: compactSpecs(variant.specs),
        })
      } else {
        await updateAdminProductVariant(id, variant.id, payload)
      }
      const [updatedProduct, updatedAudit] = await Promise.all([
        getAdminProduct(id),
        getAdminProductAuditLog(id, { limit: 20 }),
      ])
      mergeOperationalProduct(updatedProduct)
      setAuditLog(updatedAudit)
      setMessage('Вариант сохранен.')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось сохранить вариант.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!draftReadyRef.current) {
      setError('Сервис черновиков временно недоступен. Обновите страницу после завершения обновления сервера.')
      return
    }
    if (!canSave) {
      setError('Недостаточно прав для изменения товара.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')

    const price = Number(form.price)
    const quantity = Number(form.quantity)
    if (!form.titleKg.trim()) {
      setError('Заполните название KG.')
      setSaving(false)
      return
    }
    if (!form.slug.trim()) {
      setError('Заполните slug.')
      setSaving(false)
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Цена должна быть положительным числом.')
      setSaving(false)
      return
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError('Остаток должен быть целым неотрицательным числом.')
      setSaving(false)
      return
    }
    if (product?.stock?.reservedQuantity && quantity < product.stock.reservedQuantity) {
      setError(`Остаток не может быть меньше резерва (${product.stock.reservedQuantity}).`)
      setSaving(false)
      return
    }

    publishingRef.current = true
    try {
      await saveDraftQueueRef.current.catch(() => undefined)
      const payload = buildDraftPayload(form, {
        content: canEditContent,
        commercial: canEditCommercial,
        active: canEditActive,
      })
      if (canEditCommercial) {
        payload.price = price
        payload.stockQuantity = quantity
      }
      const fingerprint = draftFingerprint(payload)
      if (!draft || fingerprint !== savedDraftFingerprintRef.current) {
        const savedDraft = await saveAdminProductDraft(id, payload, draftVersionRef.current)
        draftVersionRef.current = savedDraft.version
        savedDraftFingerprintRef.current = fingerprint
        setDraft(savedDraft)
      }
      setDraftStatus('publishing')
      const updated = await publishAdminProductDraft(id)
      const publishedForm = createForm(updated)
      const publishedFingerprint = draftFingerprint(buildDraftPayload(publishedForm, {
        content: canEditContent,
        commercial: canEditCommercial,
        active: canEditActive,
      }))
      savedDraftFingerprintRef.current = publishedFingerprint
      latestDraftFingerprintRef.current = publishedFingerprint
      draftVersionRef.current = 0
      setProduct(updated)
      setForm(publishedForm)
      setDraft(null)
      setDraftStatus('published')
      setMessage('Товар опубликован. Изменения уже доступны на сайте.')
      getAdminProductAuditLog(id, { limit: 20 }).then(setAuditLog).catch(() => {})
      getAdminProductOptions().then(setOptions).catch(() => {})
    } catch (requestError) {
      setDraftStatus('error')
      setError(requestError.message || 'Не удалось опубликовать товар.')
    } finally {
      publishingRef.current = false
      setSaving(false)
    }
  }

  async function handleDiscardDraft() {
    if (saving) return
    setSaving(true)
    publishingRef.current = true
    setError('')
    try {
      if (draft) await discardAdminProductDraft(id)
      const publishedForm = createForm(product)
      const fingerprint = draftFingerprint(buildDraftPayload(publishedForm, {
        content: canEditContent,
        commercial: canEditCommercial,
        active: canEditActive,
      }))
      savedDraftFingerprintRef.current = fingerprint
      latestDraftFingerprintRef.current = fingerprint
      draftVersionRef.current = 0
      setForm(publishedForm)
      setDraft(null)
      setDraftStatus('idle')
      setMessage('Черновик удалён. Восстановлена опубликованная версия.')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось удалить черновик.')
    } finally {
      publishingRef.current = false
      setSaving(false)
    }
  }

  const draftStatusText = {
    dirty: 'Есть неопубликованные изменения. Автосохранение начнётся через пару секунд…',
    saving: 'Сохраняем черновик автоматически…',
    saved: `Черновик сохранён${draft?.updatedAt ? ` · ${new Date(draft.updatedAt).toLocaleString('ru-RU')}` : ''}. На сайте пока старая версия.`,
    error: 'Черновик не сохранён. Проверьте сообщение об ошибке и соединение.',
    publishing: 'Публикуем изменения на сайте…',
    published: 'Все изменения опубликованы.',
  }[draftStatus]

  if (loading) return <div className="admin-state">Загружаем товар...</div>
  if (!form || !product) return <div className="admin-alert admin-alert-error">{error || 'Товар не найден.'}</div>

  return (
    <section>
      <Link className="admin-back-link" to="/admin/products">← К списку товаров</Link>
      <form className="admin-product-editor" data-qa="admin-product-edit-form" onSubmit={handleSave}>
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">Товар</span>
            <h1>{form.titleKg || product.title}</h1>
            <p>{form.slug} · {form.sku || 'без SKU'}</p>
          </div>
          <div className="admin-heading-actions">
            <a className="admin-secondary-button" href={`/product/${product.slug}`} target="_blank" rel="noreferrer">
              Открыть на сайте
            </a>
            {(draft || ['dirty', 'error'].includes(draftStatus)) && (
              <button className="admin-secondary-button" type="button" disabled={saving} onClick={handleDiscardDraft}>
                Отменить черновик
              </button>
            )}
            <button className="admin-primary-button" type="submit" disabled={saving || !canSave || !draftServiceReady}>
              {saving ? 'Публикуем...' : 'Опубликовать'}
            </button>
          </div>
        </div>

        {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
        {message && <div className="admin-alert admin-alert-success" role="status">{message}</div>}
        {draftStatusText && (
          <div className={`admin-draft-status admin-draft-status-${draftStatus}`} role="status" data-qa="product-draft-status">
            <strong>Черновик:</strong> {draftStatusText}
          </div>
        )}
        {!canSave && (
          <div className="admin-alert admin-alert-error" role="status">
            У вашей роли есть только просмотр этого товара.
          </div>
        )}

        <div className="admin-detail-grid">
          <article className="admin-card admin-edit-form">
            <h2>Основное</h2>
            <label>
              Название KG
              <input data-qa="edit-title-kg" value={form.titleKg} onChange={(event) => updateField('titleKg', event.target.value)} maxLength={180} required disabled={!canEditContent} />
            </label>
            <label>
              Название RU
              <input data-qa="edit-title-ru" value={form.titleRu} onChange={(event) => updateField('titleRu', event.target.value)} maxLength={180} disabled={!canEditContent} />
            </label>
            <label>
              Slug
              <input data-qa="edit-slug" value={form.slug} onChange={(event) => updateField('slug', event.target.value)} maxLength={180} required disabled={!canEditContent} />
            </label>
            <label>
              SKU
              <input data-qa="edit-sku" value={form.sku} onChange={(event) => updateField('sku', event.target.value)} maxLength={80} required disabled={!canEditContent} />
            </label>
            <label>
              Категория
              <select data-qa="edit-category" value={form.catalogNodeId} onChange={(event) => updateField('catalogNodeId', event.target.value)} required disabled={!canEditContent}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {'- '.repeat(Math.max(category.level || 0, 0))}{category.titleKg} · {category.path}
                  </option>
                ))}
              </select>
            </label>
            <AdminBrandEditor
              brands={brands}
              value={form.brandId}
              onChange={(brandId) => updateField('brandId', brandId)}
              onBrandsChange={updateBrands}
              disabled={!canEditContent}
              selectQa="edit-brand"
            />
            <label>
              Единица KG
              <select data-qa="edit-unit" value={form.unit} onChange={(event) => updateField('unit', event.target.value)} disabled={!canEditContent}>
                {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label>
              Единица RU
              <input data-qa='edit-unit-ru' value={form.unitRu} onChange={(event) => updateField('unitRu', event.target.value)} maxLength={80} placeholder='шт., метр, кг' disabled={!canEditContent} />
            </label>
            <label className="admin-checkbox-field">
              <input data-qa="edit-active" type="checkbox" checked={form.isActive} onChange={(event) => updateField('isActive', event.target.checked)} disabled={!canEditActive} />
              Показывать товар в магазине
            </label>
          </article>

          <article className="admin-card admin-edit-form">
            <h2>Цена и остаток</h2>
            <label>
              Цена, KGS
              <input data-qa="edit-price" type="number" min="0.01" max="9999999999.99" step="0.01" value={form.price} onChange={(event) => updateField('price', event.target.value)} required disabled={!canEditCommercial} />
            </label>
            <label>
              Остаток
              <input data-qa="edit-stock" type="number" min={product.stock?.reservedQuantity || 0} step="1" value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} required disabled={!canEditCommercial} />
            </label>
            <label>
              Статус наличия
              <select data-qa="edit-stock-status" value={form.stockStatus} onChange={(event) => updateField('stockStatus', event.target.value)} disabled={!canEditCommercial}>
                {stockOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <small>
              Текущая цена: {formatPrice(product.price)}. Зарезервировано: {product.stock?.reservedQuantity || 0}.
            </small>
          </article>
        </div>

        <div className='admin-detail-grid'>
          <article className='admin-card admin-edit-form'>
            <h2>Продажа и фасовка KG</h2>
            <label>
              Фасовка KG
              <input data-qa='edit-package-info-kg' value={form.packageInfoKg} onChange={(event) => updateField('packageInfoKg', event.target.value)} maxLength={500} placeholder='Мисалы: 1 даана' disabled={!canEditContent} />
            </label>
            <label>
              Минималдуу заказ KG
              <input data-qa='edit-min-order-kg' value={form.minOrder} onChange={(event) => updateField('minOrder', event.target.value)} maxLength={180} placeholder='Мисалы: 1 метр' disabled={!canEditContent} />
            </label>
          </article>

          <article className='admin-card admin-edit-form'>
            <h2>Продажа и фасовка RU</h2>
            <label>
              Фасовка RU
              <input data-qa='edit-package-info-ru' value={form.packageInfoRu} onChange={(event) => updateField('packageInfoRu', event.target.value)} maxLength={500} placeholder='Например: 1 шт.' disabled={!canEditContent} />
            </label>
            <label>
              Минимальный заказ RU
              <input data-qa='edit-min-order-ru' value={form.minOrderRu} onChange={(event) => updateField('minOrderRu', event.target.value)} maxLength={180} placeholder='Например: 1 метр' disabled={!canEditContent} />
            </label>
          </article>
        </div>

        <div className="admin-detail-grid">
          <article className="admin-card admin-edit-form">
            <h2>Описание KG</h2>
            <label>
              Короткое описание
              <textarea data-qa="edit-short-description-kg" rows={3} value={form.shortDescriptionKg} onChange={(event) => updateField('shortDescriptionKg', event.target.value)} maxLength={1200} disabled={!canEditContent} />
            </label>
            <label>
              Полное описание KG
              <textarea data-qa="edit-description-kg" rows={8} value={form.descriptionKg} onChange={(event) => updateField('descriptionKg', event.target.value)} maxLength={5000} disabled={!canEditContent} />
            </label>
          </article>

          <article className="admin-card admin-edit-form">
            <h2>Описание RU</h2>
            <label>
              Короткое описание RU
              <textarea data-qa='edit-short-description-ru' rows={3} value={form.shortDescriptionRu} onChange={(event) => updateField('shortDescriptionRu', event.target.value)} maxLength={1200} disabled={!canEditContent} />
            </label>
            <label>
              Полное описание RU
              <textarea data-qa="edit-description-ru" rows={8} value={form.descriptionRu} onChange={(event) => updateField('descriptionRu', event.target.value)} maxLength={5000} disabled={!canEditContent} />
            </label>
            <label>
              Внутренняя заметка
              <textarea data-qa="edit-admin-note" rows={5} value={form.adminNote} onChange={(event) => updateField('adminNote', event.target.value)} maxLength={2000} disabled={!canEditContent} />
            </label>
          </article>
        </div>

        <article className="admin-card admin-edit-form">
          <div className="admin-section-header">
            <h2>Характеристики KG</h2>
            <button type="button" className="admin-secondary-button" disabled={!canEditContent} onClick={() => addRow('specs', emptySpec())}>
              Добавить характеристику
            </button>
          </div>
          <div className="admin-repeat-list">
            {form.specs.map((row, index) => (
              <div className="admin-repeat-row admin-repeat-row-spec" key={`spec-${index}`}>
                <input data-qa="edit-spec-key" placeholder="Ключ" value={row.key} onChange={(event) => updateRow('specs', index, 'key', event.target.value)} maxLength={120} disabled={!canEditContent} />
                <input data-qa="edit-spec-value" placeholder="Значение" value={row.value} onChange={(event) => updateRow('specs', index, 'value', event.target.value)} maxLength={500} disabled={!canEditContent} />
                <button type="button" className="admin-danger-button" disabled={!canEditContent} onClick={() => removeRow('specs', index, emptySpec())}>Удалить</button>
              </div>
            ))}
          </div>
        </article>

        <article className='admin-card admin-edit-form'>
          <div className='admin-section-header'>
            <h2>Характеристики RU</h2>
            <button type='button' className='admin-secondary-button' disabled={!canEditContent} onClick={() => addRow('specsRu', emptySpec())}>
              Добавить характеристику RU
            </button>
          </div>
          <div className='admin-repeat-list'>
            {form.specsRu.map((row, index) => (
              <div className='admin-repeat-row admin-repeat-row-spec' key={`spec-ru-${index}`}>
                <input data-qa='edit-spec-ru-key' placeholder='Название RU' value={row.key} onChange={(event) => updateRow('specsRu', index, 'key', event.target.value)} maxLength={120} disabled={!canEditContent} />
                <input data-qa='edit-spec-ru-value' placeholder='Значение RU' value={row.value} onChange={(event) => updateRow('specsRu', index, 'value', event.target.value)} maxLength={500} disabled={!canEditContent} />
                <button type='button' className='admin-danger-button' disabled={!canEditContent} onClick={() => removeRow('specsRu', index, emptySpec())}>Удалить</button>
              </div>
            ))}
          </div>
        </article>

        <div className='admin-detail-grid'>
          <article className='admin-card admin-edit-form'>
            <div className='admin-section-header'>
              <h2>Частые вопросы KG</h2>
              <button type='button' className='admin-secondary-button' disabled={!canEditContent} onClick={() => addRow('faqKg', emptyFaq())}>Добавить</button>
            </div>
            <div className='admin-repeat-list'>
              {form.faqKg.map((row, index) => (
                <div className='admin-repeat-row admin-repeat-row-faq' key={`faq-kg-${index}`}>
                  <input data-qa='edit-faq-kg-question' placeholder='Суроо KG' value={row.question} onChange={(event) => updateRow('faqKg', index, 'question', event.target.value)} maxLength={500} disabled={!canEditContent} />
                  <textarea data-qa='edit-faq-kg-answer' placeholder='Жооп KG' rows={3} value={row.answer} onChange={(event) => updateRow('faqKg', index, 'answer', event.target.value)} maxLength={2000} disabled={!canEditContent} />
                  <button type='button' className='admin-danger-button' disabled={!canEditContent} onClick={() => removeRow('faqKg', index, emptyFaq())}>Удалить</button>
                </div>
              ))}
            </div>
          </article>

          <article className='admin-card admin-edit-form'>
            <div className='admin-section-header'>
              <h2>Частые вопросы RU</h2>
              <button type='button' className='admin-secondary-button' disabled={!canEditContent} onClick={() => addRow('faqRu', emptyFaq())}>Добавить</button>
            </div>
            <div className='admin-repeat-list'>
              {form.faqRu.map((row, index) => (
                <div className='admin-repeat-row admin-repeat-row-faq' key={`faq-ru-${index}`}>
                  <input data-qa='edit-faq-ru-question' placeholder='Вопрос RU' value={row.question} onChange={(event) => updateRow('faqRu', index, 'question', event.target.value)} maxLength={500} disabled={!canEditContent} />
                  <textarea data-qa='edit-faq-ru-answer' placeholder='Ответ RU' rows={3} value={row.answer} onChange={(event) => updateRow('faqRu', index, 'answer', event.target.value)} maxLength={2000} disabled={!canEditContent} />
                  <button type='button' className='admin-danger-button' disabled={!canEditContent} onClick={() => removeRow('faqRu', index, emptyFaq())}>Удалить</button>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="admin-card admin-edit-form">
          <div className="admin-section-header">
            <h2>Документы</h2>
            <button type="button" className="admin-secondary-button" disabled={!canEditContent} onClick={() => addRow('documents', emptyDocument())}>
              Добавить документ
            </button>
          </div>
          <div className="admin-repeat-list">
            {form.documents.map((row, index) => (
              <div className="admin-repeat-row admin-repeat-row-document" key={`document-${index}`}>
                <input data-qa="edit-document-title" placeholder="Название" value={row.title} onChange={(event) => updateRow('documents', index, 'title', event.target.value)} maxLength={180} disabled={!canEditContent} />
                <input data-qa="edit-document-url" placeholder="https://... или /uploads/..." value={row.url} onChange={(event) => updateRow('documents', index, 'url', event.target.value)} maxLength={500} disabled={!canEditContent} />
                <select data-qa="edit-document-type" value={row.type} onChange={(event) => updateRow('documents', index, 'type', event.target.value)} disabled={!canEditContent}>
                  {documentTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" className="admin-danger-button" disabled={!canEditContent} onClick={() => removeRow('documents', index, emptyDocument())}>Удалить</button>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card admin-edit-form">
          <div className="admin-section-header">
            <h2>Варианты / типоразмеры</h2>
            <button type="button" className="admin-secondary-button" data-qa="edit-variant-add" disabled={!canEditContent || !canEditCommercial} onClick={addVariant}>
              Добавить вариант
            </button>
          </div>
          {form.variants.length === 0 ? (
            <div className="admin-state">У товара пока нет отдельных типоразмеров. Старый product-level price/stock продолжает работать.</div>
          ) : (
            <div className="admin-variant-editor">
              {form.variants.map((variant, index) => (
                <div className="admin-variant-row" key={variant.id || `new-variant-${index}`}>
                  <div className="admin-repeat-row admin-repeat-row-variant">
                    <label>
                      <span>Название KG</span>
                      <input data-qa="edit-variant-title-kg" value={variant.titleKg} onChange={(event) => updateVariantField(index, 'titleKg', event.target.value)} disabled={!canEditContent} maxLength={180} />
                    </label>
                    <label>
                      <span>Название RU</span>
                      <input data-qa="edit-variant-title-ru" value={variant.titleRu} onChange={(event) => updateVariantField(index, 'titleRu', event.target.value)} disabled={!canEditContent} maxLength={180} />
                    </label>
                    <label>
                      <span>SKU</span>
                      <input data-qa="edit-variant-sku" value={variant.sku} onChange={(event) => updateVariantField(index, 'sku', event.target.value)} disabled={!canEditContent} maxLength={80} />
                    </label>
                    <label>
                      <span>Цена, KGS</span>
                      <input data-qa="edit-variant-price" type="number" min="0.01" step="0.01" value={variant.price} onChange={(event) => updateVariantField(index, 'price', event.target.value)} disabled={!canEditCommercial} />
                    </label>
                    <label>
                      <span>Единица</span>
                      <select data-qa="edit-variant-unit" value={variant.unit} onChange={(event) => updateVariantField(index, 'unit', event.target.value)} disabled={!canEditContent}>
                        {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Остаток</span>
                      <input data-qa="edit-variant-stock" type="number" min={variant.reservedQuantity || 0} step="1" value={variant.stockQuantity} onChange={(event) => updateVariantField(index, 'stockQuantity', event.target.value)} disabled={!canEditCommercial} />
                    </label>
                    <label>
                      <span>Статус</span>
                      <select data-qa="edit-variant-stock-status" value={variant.stockStatus} onChange={(event) => updateVariantField(index, 'stockStatus', event.target.value)} disabled={!canEditCommercial}>
                        {stockOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Порядок</span>
                      <input data-qa="edit-variant-sort-order" type="number" min="0" step="1" value={variant.sortOrder} onChange={(event) => updateVariantField(index, 'sortOrder', event.target.value)} disabled={!canEditContent} />
                    </label>
                  </div>
                  <label className="admin-checkbox-field">
                    <input data-qa="edit-variant-active" type="checkbox" checked={variant.isActive} onChange={(event) => updateVariantField(index, 'isActive', event.target.checked)} disabled={!canEditActive} />
                    Активен на сайте
                  </label>
                  <div className="admin-repeat-list">
                    {variant.specs.map((spec, specIndex) => (
                      <div className="admin-repeat-row admin-repeat-row-spec" key={`${variant.id || index}-spec-${specIndex}`}>
                        <input data-qa="edit-variant-spec-key" placeholder="Ключ" value={spec.key} onChange={(event) => updateVariantSpec(index, specIndex, 'key', event.target.value)} disabled={!canEditContent} maxLength={120} />
                        <input data-qa="edit-variant-spec-value" placeholder="Значение" value={spec.value} onChange={(event) => updateVariantSpec(index, specIndex, 'value', event.target.value)} disabled={!canEditContent} maxLength={500} />
                        <button type="button" className="admin-danger-button" disabled={!canEditContent} onClick={() => removeVariantSpec(index, specIndex)}>Удалить</button>
                      </div>
                    ))}
                  </div>
                  <div className="admin-heading-actions">
                    <button type="button" className="admin-secondary-button" data-qa="edit-variant-spec-add" disabled={!canEditContent} onClick={() => addVariantSpec(index)}>Добавить характеристику</button>
                    <button type="button" className="admin-primary-button" data-qa="edit-variant-save" disabled={saving || (!canEditContent && !canEditCommercial && !canEditActive)} onClick={() => saveVariant(index)}>
                      {variant.isNew ? 'Создать вариант' : 'Сохранить вариант'}
                    </button>
                    {!variant.isNew && variant.isActive && (
                      <button type="button" className="admin-danger-button" data-qa="edit-variant-deactivate" disabled={saving || !canEditActive} onClick={() => saveVariant(index, false)}>
                        Деактивировать
                      </button>
                    )}
                  </div>
                  {!variant.isActive && Number(variant.price) <= 0 && (
                    <small>Черновик: укажите цену и остаток, затем включите вариант на сайте.</small>
                  )}
                  {variant.reservedQuantity > 0 && <small>Зарезервировано: {variant.reservedQuantity}</small>}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="admin-card admin-edit-form">
          <h2>SEO</h2>
          <div className="admin-detail-grid admin-detail-grid-compact">
            <label>
              SEO title KG
              <input data-qa="edit-seo-title-kg" value={form.seoTitleKg} onChange={(event) => updateField('seoTitleKg', event.target.value)} maxLength={180} disabled={!canEditContent} />
            </label>
            <label>
              SEO title RU
              <input data-qa="edit-seo-title-ru" value={form.seoTitleRu} onChange={(event) => updateField('seoTitleRu', event.target.value)} maxLength={180} disabled={!canEditContent} />
            </label>
            <label>
              SEO meta KG
              <textarea data-qa="edit-seo-description-kg" rows={3} value={form.seoDescriptionKg} onChange={(event) => updateField('seoDescriptionKg', event.target.value)} maxLength={500} disabled={!canEditContent} />
            </label>
            <label>
              SEO meta RU
              <textarea data-qa="edit-seo-description-ru" rows={3} value={form.seoDescriptionRu} onChange={(event) => updateField('seoDescriptionRu', event.target.value)} maxLength={500} disabled={!canEditContent} />
            </label>
          </div>
        </article>

        <article className="admin-card admin-edit-form">
          <div className="admin-section-header">
            <h2>Фото</h2>
            <label className="admin-file-upload admin-inline-upload">
              Загрузить фото
              <input data-qa="edit-image-file" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={uploadingImage || galleryBusy || !canUpload} onChange={handleImageUpload} />
              <span>{uploadingImage ? 'Загружаем...' : 'JPG, PNG или WEBP до 5 MB'}</span>
            </label>
            {imageUploadError && <div className="admin-alert admin-alert-error" role="alert">{imageUploadError}</div>}
          </div>
          {form.images.length === 0 ? (
            <div className="admin-state">У товара нет прикрепленных фото. На сайте будет использована заглушка.</div>
          ) : (
            <div className="admin-gallery-editor">
              {form.images.map((image, index) => (
                <div className="admin-gallery-item" key={`${image.src}-${index}`}>
                  <img src={image.src} alt={image.alt || form.titleKg} />
                  <input data-qa="edit-image-alt" value={image.alt} onChange={(event) => updateRow('images', index, 'alt', event.target.value)} maxLength={180} placeholder="Alt text" disabled={!canEditContent || galleryBusy} />
                  <div className="admin-gallery-actions">
                    <button type="button" className="admin-secondary-button" data-qa="edit-image-save" disabled={!canEditContent || galleryBusy} onClick={() => saveImageMeta(index)}>
                      Сохранить alt
                    </button>
                    <button type="button" className="admin-secondary-button" data-qa="edit-image-main" disabled={index === 0 || !canEditContent || galleryBusy} onClick={() => makeMainImage(index)}>
                      Сделать главным
                    </button>
                    <button type="button" className="admin-secondary-button" data-qa="edit-image-up" disabled={index === 0 || !canEditContent || galleryBusy} onClick={() => moveImage(index, -1)}>
                      Вверх
                    </button>
                    <button type="button" className="admin-secondary-button" data-qa="edit-image-down" disabled={index === form.images.length - 1 || !canEditContent || galleryBusy} onClick={() => moveImage(index, 1)}>
                      Вниз
                    </button>
                    <button type="button" className="admin-danger-button" data-qa="edit-image-delete" disabled={!canEditContent || galleryBusy} onClick={() => removeImage(index)}>
                      Убрать
                    </button>
                  </div>
                  <small>{index === 0 ? 'Главное фото' : `${image.storageDriver || 'legacy'} · ${image.originalName || image.storageKey || 'gallery'}`}</small>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="admin-card admin-edit-form">
          <h2>Служебные данные</h2>
          <dl>
            <div><dt>ID</dt><dd>{product.id}</dd></div>
            <div><dt>Обновлен</dt><dd>{new Date(product.updatedAt).toLocaleString('ru-RU')}</dd></div>
            <div><dt>Фото</dt><dd>{product.imageStatus === 'ready' ? 'Готово' : product.imageStatus === 'placeholder' ? 'Заглушка' : 'Нет'}</dd></div>
          </dl>
        </article>

        <article className="admin-card admin-edit-form admin-card-wide">
          <h2>История изменений</h2>
          {!auditLog?.items?.length ? (
            <div className="admin-state">История изменений пока пустая.</div>
          ) : (
            <ol className="admin-history admin-audit-history" data-qa="product-audit-log">
              {auditLog.items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{auditActionLabels[item.action] || item.action}</strong>
                    <span>{new Date(item.createdAt).toLocaleString('ru-RU')}</span>
                    {item.admin && <small>{item.admin.name || item.admin.email} · {item.admin.role}</small>}
                  </div>
                  {item.changedFields.length > 0 && (
                    <ul className="admin-audit-fields">
                      {item.changedFields.slice(0, 10).map((field) => (
                        <li key={`${item.id}-${field}`}>
                          <span>{field}</span>
                          <small>
                            {formatAuditValue(auditFieldValue(item.beforeSnapshot, field))}
                            {' -> '}
                            {formatAuditValue(auditFieldValue(item.afterSnapshot, field))}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </article>

        <div className="admin-heading-actions admin-editor-footer-actions">
          <a className="admin-secondary-button" href={`/product/${product.slug}`} target="_blank" rel="noreferrer">
            Открыть на сайте
          </a>
          {(draft || ['dirty', 'error'].includes(draftStatus)) && (
            <button className="admin-secondary-button" type="button" disabled={saving} onClick={handleDiscardDraft}>
              Отменить черновик
            </button>
          )}
          <button className="admin-primary-button" data-qa="edit-save-bottom" type="submit" disabled={saving || !canSave || !draftServiceReady}>
            {saving ? 'Публикуем...' : 'Опубликовать'}
          </button>
        </div>
      </form>
    </section>
  )
}
