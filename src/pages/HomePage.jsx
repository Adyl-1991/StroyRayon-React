import { Link } from 'react-router-dom'
import { blogPosts } from '../data/blogPosts'
import { categories } from '../data/categories'
import { CategoryCard } from '../components/catalog/CategoryCard'
import { ProductGrid } from '../components/catalog/ProductGrid'
import { TrustBlock } from '../components/marketing/TrustBlock'
import { Seo } from '../components/seo/Seo'
import { Button } from '../components/ui/Button'
import { SectionTitle } from '../components/ui/SectionTitle'
import { getProducts } from '../services/productService'
import { getPageCanonical } from '../utils/seoUtils'

export function HomePage() {
  const popularProducts = getProducts({ popular: true }).slice(0, 4)
  const saleProducts = getProducts({ sale: true }).slice(0, 4)

  return (
    <>
      <Seo title="StroyRayon" canonical={getPageCanonical('/')} />
      <section className="hero-section">
        <div className="hero-section__content">
          <p className="eyebrow">Кыргызстан боюнча курулуш материалдары</p>
          <h1>Курулуш материалдарын оңой тандаңыз</h1>
          <p>
            StroyRayon курулушка керектүү товарды өлчөмү, колдонуу багыты жана наличиеси боюнча тандап алууга жардам берет.
            Товарды себетке кошуп, заказды WhatsApp аркылуу менеджерге жөнөтө аласыз.
          </p>
          <div className="hero-actions">
            <Button to="/catalog">Каталогду ачуу</Button>
            <Button to="/contacts" variant="secondary">
              Консультация алуу
            </Button>
          </div>
        </div>
        <div className="hero-section__media" aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1100&q=80"
            alt=""
            width="1100"
            height="820"
          />
        </div>
      </section>

      <section className="page-section">
        <SectionTitle
          eyebrow="Каталог"
          title="Категориялар"
          text="Товарлар колдонуу багыты боюнча бөлүнгөн, ошондуктан керектүүсүн бат табасыз."
        />
        <div className="category-grid">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section className="page-section">
        <SectionTitle title="Популярдуу товарлар" text="Курулуш бригадалары көп заказ кылган позициялар." />
        <ProductGrid products={popularProducts} />
      </section>

      <section className="page-section">
        <SectionTitle title="Акциядагы товарлар" text="Баасы төмөндөгөн товарлар, кампадагы саны өзгөрүшү мүмкүн." />
        <ProductGrid products={saleProducts} />
      </section>

      <section className="benefits-band">
        <div>
          <h2>Эмне үчүн StroyRayon?</h2>
          <p>Биз товарды жөн эле тизмектебейбиз: кардар туура материал тандашы үчүн түшүндүрмө, кеңеш жана байланыш беребиз.</p>
        </div>
        <ul>
          <li>Сом менен так баа жана наличиеси</li>
          <li>WhatsApp аркылуу тез байланыш</li>
          <li>Бишкек жана региондорго жеткирүү</li>
          <li>Көлөмдү эсептөөгө менеджер жардам берет</li>
        </ul>
      </section>

      <TrustBlock />

      <section className="delivery-band">
        <div>
          <p className="eyebrow">Региондорго жеткирүү</p>
          <h2>Баткен, Ош, Жалал-Абад, Нарын, Ысык-Көл, Талас жана Чүйгө жөнөтөбүз</h2>
          <p>Жеткирүү баасы жана убактысы товар көлөмүнө, салмагына жана түшүрүү дарегине жараша заказ алдында такталат.</p>
        </div>
        <Button to="/delivery" variant="secondary">
          Шарттарын көрүү
        </Button>
      </section>

      <section className="consultation-band">
        <h2>Менеджерден консультация алуу</h2>
        <p>Диаметр, өлчөм, материал же комплектация боюнча күмөн санасаңыз, менеджерге сүрөт же өлчөмдөрдү жөнөтүңүз.</p>
        <Button href="https://wa.me/996700123456" target="_blank" rel="noreferrer" variant="whatsapp">
          Менеджерден кеңеш алуу
        </Button>
      </section>

      <section className="page-section">
        <SectionTitle title="Кеңештер" text="Курулуш материалдарын туура тандоого жардам берген кыска макалалар." />
        <div className="blog-grid">
          {blogPosts.slice(0, 3).map((post) => (
            <article className="blog-card" key={post.id}>
              <p className="eyebrow">{post.category}</p>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <Link to="/blog">Окуу</Link>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
