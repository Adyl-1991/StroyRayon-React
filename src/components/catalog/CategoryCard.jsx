import { Link } from 'react-router-dom'
import { useLocale } from '../../i18n/LocaleContext'
import { applyImageFallback, getCategoryImage } from '../../utils/imageUtils'

const categoryCopy = {
  pipes: {
    kg: { title: 'Трубалар', description: 'Суу, жылытуу жана монтаж системалары үчүн трубалар.' },
    ru: { title: 'Трубы', description: 'Трубы для воды, отопления и монтажных систем.' },
  },
  fittings: {
    kg: { title: 'Фитингдер', description: 'Труба системаларын бириктирүүчү муфта, уголок, тройник жана крандар.' },
    ru: { title: 'Фитинги', description: 'Муфты, уголки, тройники и краны для соединения труб.' },
  },
  sewerage: {
    kg: { title: 'Канализация', description: '50 мм жана 110 мм канализация трубалары жана фитингдери.' },
    ru: { title: 'Канализация', description: 'Канализационные трубы и фитинги 50 мм и 110 мм.' },
  },
  mixers: {
    kg: { title: 'Смесителдер', description: 'Ашкана, ванна жана умывальник үчүн смесителдер.' },
    ru: { title: 'Смесители', description: 'Смесители для кухни, ванны и умывальника.' },
  },
  tools: {
    kg: { title: 'Инструменттер', description: 'Кол жана электр шаймандары, өлчөө инструменттери.' },
    ru: { title: 'Инструменты', description: 'Ручной и электроинструмент, измерительные инструменты.' },
  },
  cement: {
    kg: { title: 'Цемент жана аралашмалар', description: 'Цемент, плитка клейи, штукатурка жана шпаклёвка.' },
    ru: { title: 'Цемент и сухие смеси', description: 'Цемент, плиточный клей, штукатурки и шпаклёвки.' },
  },
  electrics: {
    kg: { title: 'Электрика', description: 'Кабель, розетка, автомат жана монтаж материалдары.' },
    ru: { title: 'Электрика', description: 'Кабель, розетки, автоматы и монтажные материалы.' },
  },
  fasteners: {
    kg: { title: 'Крепеж', description: 'Саморез, шуруп, дюбель, анкер жана бекиткичтер.' },
    ru: { title: 'Крепёж', description: 'Саморезы, шурупы, дюбели, анкеры и крепёж.' },
  },
}

export function CategoryCard({ category }) {
  const { locale, t } = useLocale()
  const image = getCategoryImage(category)
  const copy = categoryCopy[category.id]?.[locale]

  return (
    <article className="category-card">
      <img
        src={image.src}
        alt={copy?.title || image.alt}
        loading="lazy"
        width={image.width}
        height={image.height}
        onError={(event) => applyImageFallback(event, 'category')}
      />
      <div>
        <h3>{copy?.title || category.titleKg || category.name}</h3>
        <p>{copy?.description || category.descriptionKg || category.description}</p>
        <Link to={`/catalog/${category.slug}`}>{t('common.openCategory')}</Link>
      </div>
    </article>
  )
}
