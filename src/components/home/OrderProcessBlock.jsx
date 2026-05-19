import { useLocale } from '../../i18n/LocaleContext'

function StepIcon({ type }) {
  const icons = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m15 15 4 4" />
        <path d="M9 10.5h3" />
      </>
    ),
    cart: (
      <>
        <path d="M4 5h2l2 10h9.5l2-7H7" />
        <path d="M12 8v5" />
        <path d="M9.5 10.5h5" />
        <circle cx="10" cy="20" r="1.7" />
        <circle cx="17" cy="20" r="1.7" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M6 18.5 4.8 22l3.7-1.1A8.3 8.3 0 1 0 3.7 13" />
        <path d="M9.4 8.6c.3 3 2.1 5 5 6" />
        <path d="M9.5 8.5 11 7.8l1.1 1.8-.8 1.1" />
        <path d="m14.1 13.7 1.1-.8 1.8 1.1-.7 1.5" />
      </>
    ),
    manager: (
      <>
        <path d="M4 13a8 8 0 0 1 16 0" />
        <path d="M5 13v4h3v-5H5z" />
        <path d="M16 12v5h3v-4h-3z" />
        <path d="M16 18c-.9 1.5-2.3 2.2-4 2.2" />
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
