const api = process.env.STAGE21_API_URL || 'http://127.0.0.1:4021/api'
const site = process.env.STAGE21_SITE_URL || 'http://127.0.0.1:4181'
const debuggerUrl = process.env.STAGE21_DEBUGGER_URL || 'http://127.0.0.1:9223'
const email = process.env.STAGE21_ADMIN_EMAIL
const password = process.env.STAGE21_ADMIN_PASSWORD

if (!email || !password) {
  throw new Error('STAGE21_ADMIN_EMAIL and STAGE21_ADMIN_PASSWORD are required')
}

const results = {}
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const target = await fetch(`${debuggerUrl}/json/new?${encodeURIComponent(site)}`, {
  method: 'PUT',
}).then((response) => response.json())
const websocket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  websocket.onopen = resolve
  websocket.onerror = reject
})

let sequence = 0
const pending = new Map()
websocket.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error.message))
  else resolve(message.result)
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence
    pending.set(id, { resolve, reject })
    websocket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
  return response.result.value
}

async function waitFor(expression, timeout = 10000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeout) {
    try {
      if (await evaluate(expression)) return
    } catch {
      // The page can temporarily replace its execution context during navigation.
    }
    await sleep(150)
  }
  throw new Error(`Timeout waiting for: ${expression}`)
}

async function navigate(path) {
  await send('Page.navigate', { url: `${site}${path}` })
  await waitFor("document.readyState === 'complete'")
  await sleep(350)
}

function setValue(selector, value) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)})
    if (!element) return false
    const descriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      'value',
    )
    descriptor.set.call(element, ${JSON.stringify(value)})
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  })()`)
}

await send('Page.enable')
await send('Runtime.enable')

try {
  const health = await fetch(`${api}/health`).then((response) => response.json())
  results.health = health.status === 'ok'

  await navigate('/')
  results.home = await evaluate("Boolean(document.querySelector('.app-shell header'))")
  await evaluate("localStorage.removeItem('stroyrayon_cart')")

  await navigate('/catalog')
  results.catalog = await evaluate("Boolean(document.querySelector('main'))")

  const productApi = await fetch(`${api}/products/ppr-truba-pn20-25mm`).then(
    (response) => response.json(),
  )
  await navigate(`/catalog/${productApi.catalogPath.join('/')}`)
  results.category = await evaluate("Boolean(document.querySelector('main'))")

  await navigate('/search?q=ppr')
  results.search = await evaluate("Boolean(document.querySelector('main'))")

  await navigate(`/product/${productApi.slug}`)
  await waitFor("Boolean(document.querySelector('.product-info__actions button'))", 15000)
  results.product = true
  await evaluate("document.querySelector('.product-info__actions button').click()")
  await waitFor(
    "JSON.parse(localStorage.getItem('stroyrayon_cart') || '[]').length > 0",
  )

  await navigate('/cart')
  await waitFor("Boolean(document.querySelector('.cart-item'))")
  const beforeQuantity = await evaluate(
    "Number(document.querySelector('.quantity-control span').textContent)",
  )
  await evaluate("document.querySelectorAll('.quantity-control button')[1].click()")
  await waitFor(
    `Number(document.querySelector('.quantity-control span').textContent) === ${beforeQuantity + 1}`,
  )
  results.cartQuantity = true

  await navigate('/checkout')
  await waitFor("Boolean(document.querySelector('.checkout-form'))")
  await evaluate(`(() => {
    const elements = document.querySelectorAll('.checkout-form input')
    const set = (element, value) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(element),
        'value',
      )
      descriptor.set.call(element, value)
      element.dispatchEvent(new Event('input', { bubbles: true }))
    }
    set(elements[0], 'Stage 21 Buyer')
    set(elements[1], '+996700021021')
    set(elements[2], 'Stage 21 E2E address')
    window.open = () => null
    return elements.length
  })()`)
  await sleep(200)
  await evaluate("document.querySelector('.checkout-form').requestSubmit()")
  await waitFor("Boolean(document.querySelector('.checkout-success'))", 15000)
  const checkoutText = await evaluate(
    "document.querySelector('.checkout-success').innerText",
  )
  const orderNumber = checkoutText.match(/SR-\d{4}-\d{6}/)?.[0]
  if (!orderNumber) {
    throw new Error(`Checkout did not render an order number: ${checkoutText}`)
  }
  results.checkout = true
  results.orderNumber = orderNumber

  await navigate('/admin/products')
  await waitFor("location.pathname === '/admin/login'")
  results.adminRedirect = true

  await setValue('.admin-login-card input[type=email]', email)
  await setValue('.admin-login-card input[type=password]', 'wrong-password')
  await evaluate("document.querySelector('.admin-login-card').requestSubmit()")
  await waitFor("Boolean(document.querySelector('[role=alert]'))")
  results.wrongLogin = true

  await setValue('.admin-login-card input[type=password]', password)
  await evaluate("document.querySelector('.admin-login-card').requestSubmit()")
  await waitFor("location.pathname === '/admin/orders'", 15000)
  results.correctLogin = true

  await waitFor(
    `Array.from(document.querySelectorAll('a')).some((link) => link.textContent.includes(${JSON.stringify(orderNumber)}))`,
    15000,
  )
  const orderHref = await evaluate(
    `Array.from(document.querySelectorAll('a')).find((link) => link.textContent.includes(${JSON.stringify(orderNumber)})).getAttribute('href')`,
  )
  await navigate(orderHref)
  await waitFor("Boolean(document.querySelector('.admin-status-form select'))")
  await evaluate(`(() => {
    const select = document.querySelector('.admin-status-form select')
    select.value = 'CONFIRMED'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
  await evaluate("document.querySelector('.admin-status-form button').click()")
  await waitFor("document.body.innerText.includes('Статус заказа обновлён')")
  results.status = true

  await setValue('form.admin-card textarea', 'Stage 21 internal E2E note')
  await evaluate("document.querySelector('form.admin-card').requestSubmit()")
  await waitFor("document.body.innerText.includes('Внутренняя заметка сохранена')")
  results.note = true
  results.history = await evaluate(
    "document.querySelectorAll('.admin-history li').length >= 2",
  )

  await navigate('/admin/products')
  await waitFor("Boolean(document.querySelector('.admin-products-table tbody a'))", 15000)
  await setValue('.admin-search-form input', productApi.slug)
  await evaluate("document.querySelector('.admin-search-form').requestSubmit()")
  await waitFor(
    "document.querySelectorAll('.admin-products-table tbody tr').length === 1",
  )
  const productHref = await evaluate(
    "document.querySelector('.admin-products-table tbody a').getAttribute('href')",
  )
  await navigate(productHref)
  await waitFor(
    "Boolean(document.querySelector('.admin-edit-form input[type=number]'))",
  )
  const originalPrice = await evaluate(
    "Number(document.querySelectorAll('.admin-edit-form input[type=number]')[0].value)",
  )
  const originalStock = await evaluate(
    "Number(document.querySelectorAll('.admin-edit-form input[type=number]')[1].value)",
  )
  const productId = productHref.split('/').pop()

  await setValue('.admin-edit-form input[type=number]', String(originalPrice + 1))
  await evaluate("document.querySelectorAll('form.admin-edit-form')[0].requestSubmit()")
  await waitFor("document.body.innerText.includes('Цена обновлена')")
  results.price = true

  await evaluate(`(() => {
    const input = document.querySelectorAll('.admin-edit-form input[type=number]')[1]
    const descriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(input),
      'value',
    )
    descriptor.set.call(input, String(${originalStock + 1}))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    document.querySelectorAll('form.admin-edit-form')[1].requestSubmit()
  })()`)
  await waitFor("document.body.innerText.includes('Остаток и статус обновлены')")
  results.stock = true

  const token = await evaluate("sessionStorage.getItem('stroyrayon_admin_token')")
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  const changedPublic = await fetch(`${api}/products/${productApi.slug}`).then(
    (response) => response.json(),
  )
  results.publicChanged = Number(changedPublic.price) === originalPrice + 1

  await evaluate(
    "Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Скрыть товар')).click()",
  )
  await waitFor("document.body.innerText.includes('Товар скрыт из магазина')")
  const hidden = await fetch(`${api}/products/${productApi.slug}`).then((response) =>
    response.text(),
  )
  results.inactive = hidden === '' || hidden === 'null'
  await evaluate(
    "Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Активировать товар')).click()",
  )
  await waitFor("document.body.innerText.includes('Товар снова виден в магазине')")

  await fetch(`${api}/admin/products/${productId}/price`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ price: originalPrice }),
  })
  await fetch(`${api}/admin/products/${productId}/stock`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      quantity: originalStock,
      stockStatus: productApi.stockStatus.toUpperCase(),
    }),
  })

  const maliciousOrder = await fetch(`${api}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: {
        name: 'Stage 21 Authority',
        phone: '+996700021022',
        address: 'E2E',
      },
      items: [
        {
          productId: productApi.id,
          slug: productApi.slug,
          title: 'fake',
          price: 1,
          quantity: 1,
        },
      ],
      source: 'stage21-security',
    }),
  }).then((response) => response.json())
  results.authoritative = maliciousOrder.items[0].unitPrice === originalPrice

  const adminLogin = await fetch(`${api}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((response) => response.json())
  const apiAdminHeaders = {
    Authorization: `Bearer ${adminLogin.accessToken}`,
    'Content-Type': 'application/json',
  }
  const orderList = await fetch(`${api}/admin/orders`, {
    headers: apiAdminHeaders,
  }).then((response) => response.json())
  const uiOrder = orderList.items.find((order) => order.orderNumber === orderNumber)
  const authorityOrder = orderList.items.find(
    (order) => order.orderNumber === maliciousOrder.orderNumber,
  )
  await fetch(`${api}/admin/orders/${uiOrder.id}/status`, {
    method: 'PATCH',
    headers: apiAdminHeaders,
    body: JSON.stringify({ status: 'CANCELLED' }),
  })
  await fetch(`${api}/admin/orders/${authorityOrder.id}/status`, {
    method: 'PATCH',
    headers: apiAdminHeaders,
    body: JSON.stringify({ status: 'CANCELLED' }),
  })
  results.reservationReleased = true

  const unauthorizedStatuses = await Promise.all([
    fetch(`${api}/admin/orders`).then((response) => response.status),
    fetch(`${api}/admin/products`).then((response) => response.status),
    fetch(`${api}/admin/orders/${uiOrder.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ASSEMBLING' }),
    }).then((response) => response.status),
    fetch(`${api}/admin/products/${productId}/price`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 1 }),
    }).then((response) => response.status),
  ])
  results.security = unauthorizedStatuses.every((status) => status === 401)

  await navigate('/admin/orders')
  await waitFor("Boolean(document.querySelector('.admin-header button'))")
  await evaluate("document.querySelector('.admin-header button').click()")
  await waitFor("location.pathname === '/admin/login'")
  results.logout = true

  console.log(JSON.stringify(results, null, 2))
} finally {
  try {
    await send('Target.closeTarget', { targetId: target.id })
  } catch {
    // Browser cleanup is best effort.
  }
  websocket.close()
}
