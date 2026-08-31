import './insure.css'

const DESCRIPTION = 'Free 3-minute Insurance Score for Singaporeans. See your critical illness, life/TPD, and hospitalisation gaps in real dollars — not jargon.'

export const metadata = {
  title: { default: 'InsureCheck', template: '%s · InsureCheck · nat does the math' },
  description: DESCRIPTION,
  openGraph: {
    title: "InsureCheck — Know if you're truly covered",
    description: DESCRIPTION,
    siteName: 'InsureCheck',
  },
  twitter: {
    card: 'summary_large_image',
    title: "InsureCheck — Know if you're truly covered",
    description: DESCRIPTION,
  },
}

export default function InsureLayout({ children }) {
  return <div className="v-insure">{children}</div>
}
