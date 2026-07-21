// Next's nested-segment manifest.js convention doesn't produce a route here
// (verified against a real build — only a root-level app/manifest.js does),
// so this is an explicit Route Handler instead, scoped under /etf/ the same
// way SWRegister and public/sw.js are scoped.
export async function GET() {
  return Response.json(
    {
      name: 'WhatETF — A Coah Project',
      short_name: 'WhatETF',
      description: 'Illustrative ETF portfolio allocations for Singapore investors. Runs entirely in your browser.',
      start_url: '/etf',
      scope: '/etf/',
      display: 'standalone',
      background_color: '#f3f5f2',
      theme_color: '#f3f5f2',
      icons: [
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  )
}
