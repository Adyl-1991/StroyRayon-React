import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function pngSize(path) {
  const buffer = await readFile(path)
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG')
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

test('web app manifest contains installable StroyRayon metadata', async () => {
  const manifest = await readJson('public/manifest.webmanifest')
  assert.equal(manifest.id, '/')
  assert.equal(manifest.scope, '/')
  assert.match(manifest.start_url, /^\//)
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.theme_color, '#1f6b4f')
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'))
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'))
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'))
})

test('PWA icons have the sizes declared by the manifest', async () => {
  assert.deepEqual(await pngSize('public/icons/pwa-192.png'), { width: 192, height: 192 })
  assert.deepEqual(await pngSize('public/icons/pwa-512.png'), { width: 512, height: 512 })
  assert.deepEqual(await pngSize('public/icons/pwa-maskable-512.png'), { width: 512, height: 512 })
  assert.deepEqual(await pngSize('public/icons/apple-touch-icon.png'), { width: 180, height: 180 })
})

test('service worker supplies an offline navigation shell and runtime asset cache', async () => {
  const source = await readFile('public/sw.js', 'utf8')
  assert.match(source, /addEventListener\('install'/)
  assert.match(source, /addEventListener\('activate'/)
  assert.match(source, /addEventListener\('fetch'/)
  assert.match(source, /request\.mode === 'navigate'/)
  assert.match(source, /caches\.match\('\/'\)/)
})

test('application registers the worker and renders the install experience', async () => {
  const [html, main, app, prompt] = await Promise.all([
    readFile('index.html', 'utf8'),
    readFile('src/main.jsx', 'utf8'),
    readFile('src/app/App.jsx', 'utf8'),
    readFile('src/components/pwa/PwaInstallPrompt.jsx', 'utf8'),
  ])
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/)
  assert.match(html, /rel="apple-touch-icon"/)
  assert.match(main, /registerServiceWorker\(\)/)
  assert.match(app, /<PwaInstallPrompt \/>/)
  assert.match(prompt, /beforeinstallprompt/)
  assert.match(prompt, /appinstalled/)
  assert.match(prompt, /display-mode: standalone/)
})
