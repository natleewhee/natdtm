// A single label/value line in a "Show the math" breakdown — duplicated
// verbatim across several tools' page.js files (each with its own C
// theme object passed in, since colors are literal per-vertical hex, not
// shared CSS vars). Promoted here so new tools don't re-paste it.
export default function Row({ C, label, value, tone, bold, indent }) {
  const color = tone === 'red' ? C.redText : tone === 'green' ? C.greenText : tone === 'blue' ? C.blueText : C.text
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: `1px solid ${C.border}`, paddingLeft: indent ? 16 : 0 }}>
      <span style={{ fontSize: C.sm, color: bold ? C.primary : C.muted, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: bold ? C.lg : C.sm, fontFamily: C.fontMono, fontWeight: bold ? 700 : 600, color }}>{value}</span>
    </div>
  )
}
