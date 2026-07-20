// Minimal service worker: caches the app shell so WhatETF installs as a
// PWA and keeps working offline. Network-first for page navigations (so
// online users always see the latest deploy), cache-first for static
// build assets. Bump CACHE_VERSION to force clients to drop old caches.
// Scoped to /etf/ at registration time (see components/etf/SWRegister.js) —
// this worker must only ever control the WhatETF section of coah, never the
// Insure/Drive verticals or the shell.
const CACHE_VERSION = 'v1'
const CACHE_NAME = `whatetf-${CACHE_VERSION}`
const SHELL_URLS = ['/etf', '/etf/preferences', '/etf/portfolio', '/etf/the-math', '/etf/rebalance', '/etf/compare', '/etf/learn']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(SHELL_URLS.map((url) => cache.add(url).catch(() => {})))
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/etf')))
    )
    return
  }

  if (request.url.includes('/_next/static/') || /\.(svg|ico|woff2?)$/.test(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return response
      }))
    )
  }
})
