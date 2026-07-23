import { Link } from 'react-router-dom'
import { useLocale } from '../../i18n/LocaleContext'
import { normalizeKyrgyzText } from '../../i18n/kyrgyzText'
import { applyImageFallback, getCategoryImage } from '../../utils/imageUtils'

const categoryCopy = {
  pipes: {
    kg: { title: 'Суу түтүктөрү & фитингдер', description: 'Суу линиялары үчүн түтүктөр, фитингдер, подводка жана крандар.' },
    ru: { title: 'Водопроводные трубы и фитинги', description: 'Трубы, фитинги, подводка и краны для водяных линий.' },
  },
  fittings: {
    kg: { title: 'Фитингдер', description: 'Түтүк системаларын бириктирүүчү муфта, бурчтук, тройник жана крандар.' },
    ru: { title: 'Фитинги', description: 'Муфты, уголки, тройники и краны для соединения труб.' },
  },
  sewerage: {
    kg: { title: 'Канализация', description: '50 мм жана 110 мм канализация түтүктөрү жана фитингдери.' },
    ru: { title: 'Канализация', description: 'Канализационные трубы и фитинги 50 мм и 110 мм.' },
  },
  mixers: {
    kg: { title: 'Смесителдер', description: 'Ашкана, ванна жана умывальник үчүн смесителдер.' },
    ru: { title: 'Смесители', description: 'Смесители для кухни, ванны и умывальника.' },
  },
  tools: {
    kg: { title: 'Шаймандар', description: 'Кол жана электр шаймандары, өлчөө шаймандары.' },
    ru: { title: 'Инструменты', description: 'Ручной и электроинструмент, измерительные инструменты.' },
  },
  cement: {
    kg: { title: 'Цемент жана аралашмалар', description: 'Цемент, плитка клейи, штукатурка жана шпаклёвка.' },
    ru: { title: 'Цемент и сухие смеси', description: 'Цемент, плиточный клей, штукатурки и шпаклёвки.' },
  },
  electrics: {
    kg: { title: 'Электр жабдуулары', description: 'Кабель, розетка, автоматтык өчүргүч жана орнотуу материалдары.' },
    ru: { title: 'Электрика', description: 'Кабель, розетки, автоматы и монтажные материалы.' },
  },
  fasteners: {
    kg: { title: 'Бекиткичтер', description: 'Саморез, шуруп, дюбел, анкер жана бекиткичтер.' },
    ru: { title: 'Крепёж', description: 'Саморезы, шурупы, дюбели, анкеры и крепёж.' },
  },
}

export function CategoryCard({ category }) {
  const { locale, t } = useLocale()
  const image = getCategoryImage(category)
  const copy = categoryCopy[category.id]?.[locale]
  const title = copy?.title || category.titleKg || category.name
  const description = copy?.description || category.descriptionKg || category.description
  const localizedTitle = locale === 'kg' ? normalizeKyrgyzText(title) : title
  const localizedDescription = locale === 'kg' ? normalizeKyrgyzText(description) : description

  return (
    <article className="category-card">
      <img
        src={image.src}
        alt={localizedTitle || image.alt}
        loading="lazy"
        width={image.width}
        height={image.height}
        onError={(event) => applyImageFallback(event, 'category')}
      />
      <div>
        <h3>{localizedTitle}</h3>
        <p>{localizedDescription}</p>
        <Link to={`/catalog/${category.slug}`}>{t('common.openCategory')}</Link>
      </div>
    </article>
  )
}
