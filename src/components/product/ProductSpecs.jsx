export function ProductSpecs({ specs }) {
  return (
    <section className="detail-panel">
      <h2>Характеристика</h2>
      <dl className="specs">
        {Object.entries(specs).map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
