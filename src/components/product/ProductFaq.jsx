export function ProductFaq({ items = [] }) {
  const fallbackItems = [
    {
      question: 'Бул товар боюнча кантип кеңеш алсам болот?',
      answer: 'WhatsApp аркылуу товар атын жана колдонуу жерин жазсаңыз, менеджер туура вариантты тактап берет.',
    },
  ]
  const faqItems = items.length ? items : fallbackItems

  return (
    <section className="detail-panel product-faq">
      <h2>Көп берилген суроолор</h2>
      {faqItems.map((item) => (
        <details key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </section>
  )
}
