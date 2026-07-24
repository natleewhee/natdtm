import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1b2320',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{
          display: 'flex',
          fontSize: 26,
          letterSpacing: 6,
          opacity: 0.55,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Nat Does The Math
        </div>
        <div style={{ display: 'flex', fontSize: 104, fontWeight: 700 }}>
          InsureCheck
        </div>
        <div style={{ display: 'flex', fontSize: 34, opacity: 0.85, marginTop: 24 }}>
          Know if you&apos;re truly covered
        </div>
        <div style={{ display: 'flex', fontSize: 24, opacity: 0.55, marginTop: 44 }}>
          Free · 3-minute check · Built for Singapore
        </div>
      </div>
    ),
    { ...size }
  )
}
