import { useLocale } from '../../i18n/LocaleContext'

function StepIcon({ type }) {
  const icons = {
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m15.3 15.3 3.7 3.7" />
      </>
    ),
    cart: (
      <>
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="17" cy="20" r="1.5" />
        <path d="M3.8 4.8h2.4l2.1 10.4h8.9l2.1-7H7.4" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M20 11.7a7.6 7.6 0 0 1-11.4 6.6L5 19.4l1.2-3.4A7.6 7.6 0 1 1 20 11.7Z" />
        <path d="M9.4 8.8c.5 2.8 2.2 4.5 5 5" />
        <path d="m9.5 8.7.9-.35 1 1.75-.85.82" />
        <path d="m13.35 12.75.82-.85 1.75 1-.35.9" />
      </>
    ),
    manager: (
      <>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M4 14.5A2.5 2.5 0 0 1 6.5 12H8v6H6.5A2.5 2.5 0 0 1 4 15.5Z" />
        <path d="M20 14.5a2.5 2.5 0 0 0-2.5-2.5H16v6h1.5a2.5 2.5 0 0 0 2.5-2.5Z" />
      </>
    ),
  }

  return (
    <span className="order-process__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {icons[type]}
      </svg>
    </span>
  )
}

const iconTypes = ['search', 'cart', 'whatsapp', 'manager']

export function OrderProcessBlock() {
  const { t } = useLocale()
  const steps = t('home.orderSteps')

  return (
    <section className="order-process" aria-labelledby="order-process-title">
      <h2 id="order-process-title">{t('home.orderProcessTitle')}</h2>
      <div className="order-process__steps">
        {steps.map((step, index) => (
          <article className="order-process__step" key={step.title}>
            <StepIcon type={iconTypes[index]} />
            <div className="order-process__text">
              <span>{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
