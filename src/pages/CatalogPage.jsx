import { Link } from 'react-router-dom'
import { CatalogDirectory } from '../components/catalog/CatalogDirectory'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { useCatalogTree } from '../hooks/useCatalogTree'
import { getPageCanonical } from '../utils/seoUtils'

const quickLinks = [
  { label: 'Кургак аралашмалар', to: '/catalog/stroymaterialdar/kurgak-aralashmalar' },
  { label: 'Штукатуркалар', to: '/catalog/stroymaterialdar/kurgak-aralashmalar/shtukaturkalar' },
  { label: 'ППР трубалар', to: '/catalog/trubalar-fitingder/ppr-sistema/ppr-trubalar' },
  { label: 'Канализация 110 мм', to: '/catalog/kanalizaciya/ichki-kanalizaciya/kanalizaciya-trubalary-110' },
  { label: 'Саморездер', to: '/catalog/krepezh/samorezder' },
]

export function CatalogPage() {
  const { nodes, isLoading } = useCatalogTree()

  return (
    <main className="page catalog-directory-page">
      <Seo
        title="Каталог"
        description="StroyRayon каталогу: курулуш материалдарын бөлүм, колдонуу багыты жана товар түрү боюнча тез табыңыз."
        canonical={getPageCanonical('/catalog')}
      />
      <Breadcrumbs items={[{ label: 'Каталог' }]} />
      <div className="page-heading page-heading--compact">
        <h1>Каталог</h1>
        <p>Керектүү товарды чоң бөлүмдөн баштап так тармакка чейин тандаңыз. Бренддер товар ичинде фильтр катары гана көрсөтүлөт.</p>
      </div>

      <section className="quick-catalog-links" aria-labelledby="quick-catalog-title">
        <h2 id="quick-catalog-title">Көп суралган бөлүмдөр</h2>
        <div>
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <CatalogDirectory nodes={nodes} />
      {isLoading && (
        <p className="microcopy" role="status">
          Каталог жаңыланууда...
        </p>
      )}
    </main>
  )
}
