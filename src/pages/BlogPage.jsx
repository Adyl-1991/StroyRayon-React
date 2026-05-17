import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Seo } from '../components/seo/Seo'
import { blogPosts } from '../data/blogPosts'
import { getPageCanonical } from '../utils/seoUtils'

export function BlogPage() {
  return (
    <main className="page">
      <Seo title="Кеңештер" description="StroyRayon блогунда курулуш материалдарын тандоо, сарптоо эсептөө жана жеткирүү боюнча пайдалуу кыргызча кеңештер." canonical={getPageCanonical('/blog')} />
      <Breadcrumbs items={[{ label: 'Кеңештер' }]} />
      <div className="page-heading">
        <h1>Курулуш боюнча кеңештер</h1>
        <p>Материал тандоо, сарптоо эсептөө жана жеткирүүнү пландоо боюнча пайдалуу макалалар.</p>
      </div>
      <section className="blog-grid">
        {blogPosts.map((post) => (
          <article className="blog-card" key={post.id}>
            <p className="eyebrow">
              {post.category} · {post.date}
            </p>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
