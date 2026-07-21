// One shared "which tool am I in" header, used by every page across all
// three verticals instead of each page reimplementing its own — that drift
// (different link counts, font sizes, tap-target spacing) is exactly what
// made the app feel like three stitched-together tools instead of one.
export default function SubNav({
  title,
  eyebrow = 'Coah',
  breadcrumb,
  backHref,
  onBack,
  links = [],
  step,
  below,
}) {
  return (
    <div className="subnav">
      <div className="subnav-row">
        <div className="subnav-left">
          {(backHref || onBack) && (
            backHref ? (
              <a href={backHref} className="subnav-back" aria-label="Go back">←</a>
            ) : (
              <button type="button" onClick={onBack} className="subnav-back" aria-label="Go back">←</button>
            )
          )}
          <div className="subnav-brand">
            <span className="subnav-eyebrow">{eyebrow}</span>
            <span className="subnav-title">{breadcrumb ? `${breadcrumb} › ${title}` : title}</span>
          </div>
        </div>
        <div className="subnav-right">
          {step && <span className="subnav-step">{step}</span>}
          {links.map((l) => (
            <a key={l.href} href={l.href} className="subnav-link">{l.label}</a>
          ))}
        </div>
      </div>
      {below}
    </div>
  )
}
