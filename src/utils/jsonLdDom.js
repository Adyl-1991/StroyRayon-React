export function upsertJsonLd(id, data) {
  if (typeof document === 'undefined') return

  let script = document.getElementById(id)
  if (!data) {
    script?.remove()
    return
  }

  if (!script) {
    script = document.createElement('script')
    script.id = id
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(data)
}

export function removeJsonLd(id, expectedData) {
  if (typeof document === 'undefined') return

  const script = document.getElementById(id)
  if (!script) return
  if (expectedData && script.textContent !== JSON.stringify(expectedData)) return
  script.remove()
}
