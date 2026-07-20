'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/insure', label: 'Insure' },
  { href: '/drive', label: 'Drive' },
  { href: '/etf', label: 'Invest' },
]

export default function Nav() {
  const pathname = usePathname()
  return (
    <nav className="shell-nav">
      <div className="shell-wrap shell-nav-inner">
        <Link href="/" className="shell-brand">coah</Link>
        <div className="shell-links">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + '/')
            return (
              <a
                key={l.href}
                href={l.href}
                className="shell-link"
                aria-current={active ? 'page' : undefined}
              >
                {l.label}
              </a>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
