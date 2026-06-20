import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Seo } from '../components/seo/Seo'
import { blogPosts } from '../data/blogPosts'
import { getPageCanonical } from '../utils/seoUtils'
import { useLocale } from '../i18n/LocaleContext'

export function BlogPage() {
  const { locale, t } = useLocale()

  return (
    <main className="page">
      <Seo title={t('home.adviceTitle')} description={t('home.adviceText')} canonical={getPageCanonical('/blog')} />
      <Breadcrumbs items={[{ label: t('home.adviceTitle') }]} />
      <div className="page-heading">
        <h1>{t('home.adviceTitle')}</h1>
        <p>{t('home.adviceText')}</p>
      </div>
      <section className="blog-grid">
        {blogPosts.map((post) => (
          <article className="blog-card" key={post.id}>
            <p className="eyebrow">
              {locale === 'ru' ? post.categoryRu : post.category} · {post.date}
            </p>
            <h2>{locale === 'ru' ? post.titleRu : post.title}</h2>
            <p>{locale === 'ru' ? post.excerptRu : post.excerpt}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
