export const contactConfig = {
  phone: '+996 553 12 19 91',
  phoneDigits: '996553121991',
  whatsapp: '996553121991',
  telegram: '+996 553 12 19 91',
  telegramUrl: 'tg://resolve?phone=996553121991',
  address: 'Бишкек шаары',
}

export function getWhatsAppUrl(text) {
  return `https://wa.me/${contactConfig.whatsapp}?text=${encodeURIComponent(text)}`
}
