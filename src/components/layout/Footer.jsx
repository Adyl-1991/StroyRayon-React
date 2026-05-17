import { Link } from 'react-router-dom'
import { contactConfig } from '../../services/whatsappService'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Logo showTagline />
        <p>Курулуш материалдарын тандоо, заказ кылуу жана региондорго жеткирүү үчүн ишенимдүү онлайн аянтча.</p>
      </div>
      <div>
        <h3>Бөлүмдөр</h3>
        <Link to="/catalog">Каталог</Link>
        <Link to="/delivery">Жеткирүү жана төлөм</Link>
        <Link to="/blog">Кеңештер</Link>
      </div>
      <div>
        <h3>Байланыш</h3>
        <a href={`tel:${contactConfig.phone.replaceAll(' ', '')}`}>{contactConfig.phone}</a>
        <a href={`https://wa.me/${contactConfig.whatsapp}`}>WhatsApp</a>
        <a href={`https://t.me/${contactConfig.telegram.replace('@', '')}`}>{contactConfig.telegram}</a>
      </div>
    </footer>
  )
}
