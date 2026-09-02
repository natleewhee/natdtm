// One primary-action button shape for the whole product. The verticals
// previously each rolled their own: Insure inline-styled <a>, ETF a
// .heroCta CSS-module class, Drive a .ndtm-btn-primary + inline-style
// <button> — same button, three slightly different paddings/weights/
// shadows. This is that button once. Renders <a> when given href, else
// <button>. Styling (incl. hover/focus/disabled) lives in globals.css
// under .ndtm-button so states actually work, unlike inline styles.
export default function Button({
  href,
  variant = 'accent', // 'accent' (green) | 'dark' (ink) | 'outline'
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const cls = [
    'ndtm-button',
    `ndtm-button--${variant}`,
    fullWidth ? 'ndtm-button--full' : '',
    className,
  ].filter(Boolean).join(' ')

  if (href) {
    return <a href={href} className={cls} {...rest}>{children}</a>
  }
  return <button className={cls} {...rest}>{children}</button>
}
