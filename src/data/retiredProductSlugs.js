export const retiredProductSlugs = Object.freeze([
  'start-shpaklevka-20kg',
  'alinex-stukaturka-gipsovaia-usilennaia-alinex-grender-wp',
])

export const retiredProductIds = Object.freeze([
  'start-putty-20kg',
  'alinex-92',
])

const retiredProductSlugSet = new Set(retiredProductSlugs)
const retiredProductIdSet = new Set(retiredProductIds)

export function isRetiredProductSlug(value) {
  return retiredProductSlugSet.has(String(value || '').trim())
}

export function isRetiredProductId(value) {
  return retiredProductIdSet.has(String(value || '').trim())
}
