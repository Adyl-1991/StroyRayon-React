import { Button } from './Button'

export function EmptyState({ title, text, actionText = 'Каталогго өтүү', actionTo = '/catalog' }) {
  return (
    <section className="empty-state">
      <h1>{title}</h1>
      <p>{text}</p>
      <Button to={actionTo}>{actionText}</Button>
    </section>
  )
}
