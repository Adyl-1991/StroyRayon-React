import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.PWA_QA_BASE_URL || 'http://127.0.0.1:4190'
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const debugPort = Number(process.env.PWA_QA_DEBUG_PORT || 9500 + Math.floor(Math.random() * 300))
const profileDir = path.join(process.env.TEMP || process.cwd(), `stroyrayon-pwa-qa-${Date.now()}`)
const screenshotPath = path.resolve(process.env.PWA_QA_SCREENSHOT || 'preview/pwa-install/stroyrayon-pwa-browser-qa.png')
const iosScreenshotPath = path.resolve(process.env.PWA_QA_IOS_SCREENSHOT || 'preview/pwa-install/stroyrayon-pwa-ios-qa.png')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForChrome() {
  const started = Date.now()
  while (Date.now() - started < 20000) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`)
      if (response.ok) return
    } catch {}
    await delay(200)
  }
  throw new Error('Chrome DevTools did not start')
}

function createClient(ws) {
  let nextId = 0
  const pending = new Map()
  ws.addEventListener('message', async (event) => {
    const raw = typeof event.data === 'string' ? event.data : await event.data.text()
    const message = JSON.parse(raw)
    if (!message.id || !pending.has(message.id)) return
    const request = pending.get(message.id)
    pending.delete(message.id)
    clearTimeout(request.timer)
    if (message.error) request.reject(new Error(message.error.message))
    else request.resolve(message.result || {})
  })
  return {
    send(method, params = {}) {
      nextId += 1
      const id = nextId
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error(`CDP timeout: ${method}`))
        }, 30000)
        pending.set(id, { resolve, reject, timer })
        ws.send(JSON.stringify({ id, method, params }))
      })
    },
    close() {
      ws.close()
    },
  }
}

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text)
  return response.result?.value
}

async function waitForPage(cdp) {
  await evaluate(cdp, `new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (document.readyState === 'complete' && document.body?.innerText?.length > 30) return setTimeout(resolve, 700);
      if (Date.now() - started > 15000) return resolve();
      setTimeout(tick, 100);
    };
    tick();
  })`)
}

async function main() {
  let chrome
  let cdp
  try {
    chrome = spawn(chromePath, [
      '--headless=new', '--disable-gpu', '--disable-gpu-compositing', '--disable-accelerated-2d-canvas',
      '--use-angle=swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--disable-extensions',
      '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*',
      `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDir}`, 'about:blank',
    ], { stdio: 'ignore', windowsHide: true })
    await waitForChrome()
    const targetResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' })
    assert.equal(targetResponse.ok, true, `Chrome target failed: ${targetResponse.status}`)
    const target = await targetResponse.json()
    const ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true })
      ws.addEventListener('error', reject, { once: true })
    })
    cdp = createClient(ws)
    await cdp.send('Runtime.enable')
    await cdp.send('Page.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.__pwaInstallPromptSeen = false; window.addEventListener('beforeinstallprompt', () => { window.__pwaInstallPromptSeen = true; });`,
    })
    await cdp.send('Page.navigate', { url: baseUrl })
    await waitForPage(cdp)
    await evaluate(cdp, `navigator.serviceWorker.ready.then(() => true)`)
    await cdp.send('Page.reload', { ignoreCache: false })
    await waitForPage(cdp)
    await delay(1500)

    const manifest = await cdp.send('Page.getAppManifest')
    const installability = await cdp.send('Page.getInstallabilityErrors')
    const beforeSynthetic = await evaluate(cdp, `(() => ({
      manifest: document.querySelector('link[rel="manifest"]')?.href || '',
      serviceWorkerController: Boolean(navigator.serviceWorker.controller),
      serviceWorkerActive: false,
      promptSeen: Boolean(window.__pwaInstallPromptSeen),
      bannerVisible: Boolean(document.querySelector('.pwa-install-banner')),
    }))()`)
    beforeSynthetic.serviceWorkerActive = await evaluate(cdp, `navigator.serviceWorker.getRegistration('/').then((registration) => Boolean(registration?.active))`)

    if (!beforeSynthetic.bannerVisible) {
      await evaluate(cdp, `(() => {
        const event = new Event('beforeinstallprompt', { cancelable: true });
        event.prompt = async () => undefined;
        event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });
        window.dispatchEvent(event);
        return true;
      })()`)
      await delay(300)
    }
    const banner = await evaluate(cdp, `(() => {
      const element = document.querySelector('.pwa-install-banner');
      const rect = element?.getBoundingClientRect();
      return {
        visible: Boolean(element && rect && rect.width > 0 && rect.height > 0),
        text: element?.textContent?.replace(/\\s+/g, ' ').trim() || '',
        bottomClearance: rect ? window.innerHeight - rect.bottom : null,
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
      };
    })()`)
    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await mkdir(path.dirname(screenshotPath), { recursive: true })
    await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'))

    assert.match(manifest.url || '', /manifest\.webmanifest/)
    assert.equal(installability.installabilityErrors?.length || 0, 0, JSON.stringify(installability.installabilityErrors))
    assert.equal(beforeSynthetic.serviceWorkerActive, true)
    assert.equal(beforeSynthetic.serviceWorkerController, true)
    assert.equal(banner.visible, true)
    assert.match(banner.text, /StroyRayon/)
    assert.ok(banner.overflow <= 1, `Horizontal overflow: ${banner.overflow}px`)

    await cdp.send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
    })
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.addEventListener('beforeinstallprompt', (event) => event.stopImmediatePropagation(), true);`,
    })
    await cdp.send('Page.reload', { ignoreCache: false })
    await waitForPage(cdp)
    await delay(500)
    await evaluate(cdp, `document.querySelector('.pwa-install-banner__install')?.click()`)
    await delay(250)
    const iosGuide = await evaluate(cdp, `(() => {
      const dialog = document.querySelector('.pwa-install-dialog__sheet');
      return {
        visible: Boolean(dialog && dialog.getBoundingClientRect().height > 0),
        text: dialog?.textContent?.replace(/\\s+/g, ' ').trim() || '',
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth,
      };
    })()`)
    const iosScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    await writeFile(iosScreenshotPath, Buffer.from(iosScreenshot.data, 'base64'))
    assert.equal(iosGuide.visible, true)
    assert.match(iosGuide.text, /iPhone/)
    assert.match(iosGuide.text, /Башкы экранга кошуу/)
    assert.ok(iosGuide.overflow <= 1, `iOS guide horizontal overflow: ${iosGuide.overflow}px`)

    console.log(JSON.stringify({
      passed: true,
      baseUrl,
      manifestUrl: manifest.url,
      installabilityErrors: installability.installabilityErrors || [],
      serviceWorkerActive: beforeSynthetic.serviceWorkerActive,
      serviceWorkerController: beforeSynthetic.serviceWorkerController,
      realInstallPromptSeen: beforeSynthetic.promptSeen,
      banner,
      screenshotPath,
      iosGuide,
      iosScreenshotPath,
    }, null, 2))
  } finally {
    if (cdp) await cdp.send('Browser.close').catch(() => {})
    cdp?.close()
    if (chrome?.pid) chrome.kill()
    await delay(300)
    await rm(profileDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 }).catch(() => {})
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
