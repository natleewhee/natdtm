// Site-wide web app manifest (super-app plan U7): the whole of natdtm
// installs as one app, not just WhatETF. Next serves this at
// /manifest.webmanifest and links it from every page.
import { TOOLS } from '@/lib/shared/tools'

export default function manifest() {
  return {
    name: 'nat does the math',
    short_name: 'ndtm',
    description: 'Free calculators for the big Singapore money decisions. Runs in your browser; your numbers stay on your device.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#17120f',
    theme_color: '#17120f',
    categories: ['finance', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    shortcuts: TOOLS.slice(0, 4).map((t) => ({ name: t.name, url: t.route })),
  }
}
