import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)

const outputRoot = path.resolve('public/images/products')
const debugPort = Number(process.env.STAGE35_DEBUG_PORT || 9385)

const imageSpecs = [
  ['difavtomat-16a', 'breaker'],
  ['gofra-tutuk-16mm', 'conduit'],
  ['gofra-tutuk-20mm', 'conduit'],
  ['izolenta-kara', 'tape'],
  ['wago-tip-klemma-3-orun', 'terminal'],
  ['kabel-kanal-16x16', 'cableChannel'],
  ['kabel-kanal-25x16', 'cableChannel'],
  ['internet-kabel-cat5e', 'dataCable'],
  ['shvvp-provod-2x0-75', 'flatCable'],
  ['sip-kabel-2x16', 'bundledCable'],
  ['rozetka-ichki-montazh-ak', 'outlet'],
  ['zherge-tutashtyrgychy-bar-rozetka', 'groundedOutlet'],
  ['1-klavishaluu-ochurguch', 'singleSwitch'],
  ['2-klavishaluu-ochurguch', 'doubleSwitch'],
  ['elektr-shit-12-modul', 'panel'],
  ['led-lampa-e27-12w', 'bulb'],
  ['ulichnyi-prozhektor-30w', 'floodlight'],
  ['bur-sds-plus-6mm', 'drillBit'],
  ['bur-sds-plus-8mm', 'drillBit'],
  ['otreznoi-disk-125mm', 'cuttingDisc'],
  ['akkumulyatorduk-shurupovert-12v', 'cordlessDrill'],
  ['bolgarka-125mm', 'grinder'],
  ['kurulush-bychagy', 'utilityKnife'],
  ['shpatel-100mm', 'spatula'],
  ['shpatel-250mm', 'wideSpatula'],
  ['ruletka-5m', 'tapeMeasure'],
  ['mikser-nasadka-kurgak-aralashma', 'mixerPaddle'],
  ['ppr-tutuk-keskich', 'pipeCutter'],
  ['kanalizaciya-truba-naruzhnaya-110', 'sewerPipe'],
  ['rakovina-smesitel-basic', 'basinFaucet'],
]

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      const proc = spawn(candidate, ['--version'], { stdio: 'ignore' })
      const code = await new Promise((resolve) => proc.on('exit', resolve))
      if (code === 0) return candidate
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('Chrome executable was not found.')
}

async function getJson(url, attempts = 40) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await wait(250)
  }

  throw lastError || new Error(`Unable to fetch ${url}`)
}

async function createRuntime(chromePath, profileDir) {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], {
    stdio: 'ignore',
    windowsHide: true,
  })

  const tabs = await getJson(`http://127.0.0.1:${debugPort}/json`)
  const page = tabs.find((tab) => tab.webSocketDebuggerUrl) || tabs[0]
  if (!page?.webSocketDebuggerUrl) throw new Error('Chrome DevTools endpoint was not available.')

  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  let id = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  })

  async function send(method, params = {}) {
    id += 1
    const currentId = id
    socket.send(JSON.stringify({ id: currentId, method, params }))
    return new Promise((resolve, reject) => {
      pending.set(currentId, { resolve, reject })
    })
  }

  return {
    chrome,
    send,
    close: async () => {
      try {
        await send('Browser.close')
      } catch {
        chrome.kill()
      }
      socket.close()
    },
  }
}

function buildCanvasScript(kind) {
  return `
(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 675;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const colors = {
    bg: '#f7f8f4',
    line: '#28333b',
    soft: '#dfe6e8',
    metal: '#b9c6cc',
    dark: '#24313a',
    blue: '#2c6f91',
    orange: '#c76538',
    yellow: '#e4b340',
    red: '#b34d4f',
    green: '#4f8b64',
    black: '#171b1f',
    white: '#ffffff',
  };

  function rr(x, y, w, h, r, fill, stroke = colors.line, lw = 5) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }
  function line(points, stroke = colors.line, lw = 10, cap = 'round') {
    ctx.beginPath();
    ctx.lineCap = cap;
    ctx.lineJoin = 'round';
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  function ellipse(x, y, rx, ry, fill, stroke = colors.line, lw = 5) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }
  function shadow() {
    ellipse(450, 555, 250, 34, 'rgba(31, 43, 48, 0.13)', null);
  }
  function coil(cx, cy, radius, stroke, width, turns = 4) {
    ctx.beginPath();
    for (let i = 0; i < Math.PI * 2 * turns; i += 0.045) {
      const r = radius - i * 6;
      const x = cx + Math.cos(i) * r;
      const y = cy + Math.sin(i) * r * 0.72;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  function drawScrew() {
    line([[360,210],[540,465]], colors.metal, 30);
    line([[360,210],[540,465]], colors.line, 6);
    for (let i = 0; i < 8; i += 1) line([[384 + i*19,245 + i*27],[344 + i*19,265 + i*27]], colors.line, 4);
    rr(323,180,95,42,18,colors.dark,colors.line,5);
  }

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(704, 130, 260, 0, Math.PI * 2);
  ctx.fill();
  shadow();

  const kind = ${JSON.stringify(kind)};
  switch (kind) {
    case 'breaker':
      rr(330,140,240,390,18,colors.white);
      for (let i = 0; i < 3; i += 1) rr(356 + i*65,168,42,36,8,colors.soft,colors.line,3);
      rr(382,292,136,92,14,colors.soft);
      rr(408,310,84,38,10,colors.dark,null);
      line([[450,385],[450,468]], colors.line, 7);
      break;
    case 'conduit':
      coil(458,340,175,colors.metal,26,3.6);
      for (let i = 0; i < 12; i += 1) line([[298 + i*25,360 - Math.sin(i)*40],[315 + i*25,370 - Math.sin(i)*40]], colors.line, 3);
      line([[540,420],[685,482]], colors.metal, 28);
      line([[540,420],[685,482]], colors.line, 5);
      break;
    case 'tape':
      ellipse(450,342,160,120,colors.black,colors.line,7);
      ellipse(450,342,76,57,colors.bg,colors.line,6);
      ellipse(450,342,34,25,colors.soft,colors.line,4);
      break;
    case 'terminal':
      rr(285,250,330,150,22,'#f2c245');
      for (let i = 0; i < 3; i += 1) {
        ellipse(355 + i*95,326,28,28,colors.white,colors.line,5);
        line([[333 + i*95,286],[377 + i*95,286]], colors.line, 5);
      }
      break;
    case 'cableChannel':
      ctx.save();
      ctx.translate(446,336);
      ctx.rotate(-0.2);
      rr(-220,-70,440,140,20,colors.white);
      rr(-180,-38,360,76,12,colors.soft,colors.line,4);
      line([[-160,-5],[160,-5]], colors.white, 34);
      ctx.restore();
      break;
    case 'dataCable':
      coil(410,340,145,colors.blue,20,3.3);
      line([[540,382],[670,460]], colors.blue, 22);
      rr(650,440,78,52,10,colors.soft,colors.line,5);
      line([[666,449],[707,449]], colors.line, 4);
      break;
    case 'flatCable':
      line([[250,370],[650,300]], colors.white, 42);
      line([[250,370],[650,300]], colors.line, 5);
      line([[260,354],[640,286]], colors.soft, 10);
      line([[260,386],[640,316]], colors.soft, 10);
      break;
    case 'bundledCable':
      coil(450,336,160,colors.black,24,3.4);
      line([[545,402],[688,466]], colors.black, 30);
      line([[545,402],[688,466]], colors.line, 5);
      line([[577,422],[706,480]], colors.soft, 5);
      break;
    case 'outlet':
    case 'groundedOutlet':
      rr(323,164,254,330,26,colors.white);
      ellipse(450,326,82,82,colors.soft,colors.line,6);
      ellipse(420,326,12,20,colors.line,null);
      ellipse(480,326,12,20,colors.line,null);
      if (kind === 'groundedOutlet') {
        line([[450,250],[450,278]], colors.line, 5);
        line([[450,374],[450,402]], colors.line, 5);
      }
      break;
    case 'singleSwitch':
    case 'doubleSwitch':
      rr(318,160,264,340,26,colors.white);
      if (kind === 'singleSwitch') rr(362,210,176,240,18,colors.soft);
      else {
        rr(350,210,82,240,16,colors.soft);
        rr(468,210,82,240,16,colors.soft);
      }
      break;
    case 'panel':
      rr(285,142,330,386,18,colors.white);
      rr(320,178,260,286,10,colors.soft,colors.line,4);
      for (let y = 0; y < 3; y += 1) for (let x = 0; x < 4; x += 1) rr(342 + x*55,206 + y*70,36,44,7,colors.white,colors.line,3);
      break;
    case 'bulb':
      ellipse(450,270,92,112,colors.white,colors.line,7);
      rr(396,378,108,80,14,colors.metal);
      for (let i = 0; i < 4; i += 1) line([[405,392 + i*14],[495,392 + i*14]], colors.line, 4);
      break;
    case 'floodlight':
      ctx.save();
      ctx.translate(450,330);
      ctx.rotate(-0.1);
      rr(-150,-90,300,178,20,colors.dark);
      rr(-120,-62,240,124,12,colors.soft,colors.line,5);
      line([[-92,78],[-150,160],[150,160],[92,78]], colors.line, 12);
      ctx.restore();
      break;
    case 'drillBit':
      drawScrew();
      break;
    case 'cuttingDisc':
      ellipse(450,334,150,150,colors.soft,colors.line,7);
      ellipse(450,334,56,56,colors.bg,colors.line,6);
      for (let i = 0; i < 12; i += 1) {
        const a = i * Math.PI / 6;
        line([[450 + Math.cos(a)*82,334 + Math.sin(a)*82],[450 + Math.cos(a)*134,334 + Math.sin(a)*134]], colors.line, 3);
      }
      break;
    case 'cordlessDrill':
      rr(275,235,300,116,28,colors.green);
      rr(520,264,100,38,10,colors.dark);
      rr(370,335,78,150,16,colors.green);
      rr(346,465,126,45,12,colors.dark);
      rr(225,262,76,55,14,colors.metal);
      break;
    case 'grinder':
      rr(275,287,255,86,38,colors.green);
      ellipse(552,330,90,90,colors.soft,colors.line,7);
      ellipse(552,330,34,34,colors.bg,colors.line,5);
      line([[310,298],[232,242]], colors.dark, 22);
      break;
    case 'utilityKnife':
      ctx.save();
      ctx.translate(450,340);
      ctx.rotate(-0.36);
      rr(-175,-42,260,84,18,colors.yellow);
      line([[74,-20],[180,-20],[105,30]], colors.metal, 18);
      line([[74,20],[180,20],[105,30]], colors.line, 5);
      ctx.restore();
      break;
    case 'spatula':
    case 'wideSpatula':
      rr(kind === 'wideSpatula' ? 330 : 378,200,kind === 'wideSpatula' ? 240 : 144,130,12,colors.metal);
      line([[450,330],[450,505]], colors.line, 26);
      rr(398,480,104,44,20,colors.dark);
      break;
    case 'tapeMeasure':
      rr(322,236,256,184,36,colors.yellow);
      ellipse(450,328,54,54,colors.dark,null);
      line([[532,310],[680,238]], colors.metal, 20);
      line([[532,310],[680,238]], colors.line, 4);
      break;
    case 'mixerPaddle':
      line([[450,160],[450,520]], colors.metal, 18);
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(450,405 + i*30,105 - i*18,30,0,0,Math.PI*2);
        ctx.lineWidth = 10;
        ctx.strokeStyle = colors.line;
        ctx.stroke();
      }
      break;
    case 'pipeCutter':
      ctx.save();
      ctx.translate(450,338);
      ctx.rotate(-0.18);
      rr(-130,-100,260,160,28,colors.red);
      ellipse(20,-12,82,82,colors.bg,colors.line,8);
      line([[-114,78],[-210,156]], colors.red, 34);
      ctx.restore();
      break;
    case 'sewerPipe':
      ctx.save();
      ctx.translate(450,342);
      ctx.rotate(-0.2);
      line([[-200,-40],[210,-40]], colors.orange, 70);
      line([[-200,48],[210,48]], colors.orange, 70);
      ellipse(-210,-40,34,35,colors.orange,colors.line,6);
      ellipse(210,-40,34,35,'#e59062',colors.line,6);
      ellipse(-210,48,34,35,colors.orange,colors.line,6);
      ellipse(210,48,34,35,'#e59062',colors.line,6);
      ctx.restore();
      break;
    case 'basinFaucet':
      rr(314,424,272,52,24,colors.white);
      line([[450,424],[450,280],[540,280],[540,336]], colors.metal, 36);
      line([[450,424],[450,280],[540,280],[540,336]], colors.line, 6);
      line([[410,244],[490,244]], colors.line, 18);
      ellipse(540,358,24,18,colors.metal,colors.line,5);
      break;
    default:
      rr(310,190,280,280,24,colors.white);
  }

  return canvas.toDataURL('image/webp', 0.9);
})()
`
}

async function main() {
  const chromePath = await findChrome()
  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'stage35-product-images-'))
  const runtime = await createRuntime(chromePath, profileDir)

  try {
    await runtime.send('Runtime.enable')

    for (const [slug, kind] of imageSpecs) {
      const result = await runtime.send('Runtime.evaluate', {
        expression: buildCanvasScript(kind),
        returnByValue: true,
        awaitPromise: true,
      })

      const dataUrl = result?.result?.value
      if (!dataUrl?.startsWith('data:image/webp;base64,')) {
        throw new Error(`Chrome did not return a WebP data URL for ${slug}.`)
      }

      const dir = path.join(outputRoot, slug)
      await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, 'main.webp'), Buffer.from(dataUrl.split(',')[1], 'base64'))
      console.log(`wrote ${slug}/main.webp (${kind})`)
    }
  } finally {
    await runtime.close()
    await wait(500)
    await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 }).catch(() => {})
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
