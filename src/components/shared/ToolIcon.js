// Icon glyphs for the tools in src/lib/shared/tools.js, keyed by tool id.
// Kept out of the registry so the registry stays plain data (importable
// from server code and engines without pulling in JSX).

const GLYPHS = {
  insure: <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />,
  drive: <>
    <path d="M4 16l1.5-5a2 2 0 0 1 1.9-1.4h9.2A2 2 0 0 1 18.5 11l1.5 5" />
    <rect x="3" y="16" width="18" height="4" rx="1.5" />
    <circle cx="7.5" cy="20" r="1.2" />
    <circle cx="16.5" cy="20" r="1.2" />
  </>,
  etf: <>
    <path d="M4 16l5-5 4 4 7-8" />
    <path d="M15 7h5v5" />
  </>,
  house: <>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 10v9h12v-9" />
  </>,
  retire: <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </>,
  tax: <>
    <rect x="6" y="3" width="12" height="18" rx="1.5" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </>,
  ledger: <>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </>,
}

export default function ToolIcon({ id, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {GLYPHS[id]}
    </svg>
  )
}
