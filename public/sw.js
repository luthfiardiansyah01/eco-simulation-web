/*
 * EcoSim service worker.
 *
 * Next.js serves hashed assets under /_next/static, so those can be cached
 * safely. Navigation requests stay network-first: pages contain auth-aware
 * server output and must not be served stale while Supabase is reachable.
 */

const CACHE_NAME = 'ecosim-static-v1'
const OFFLINE_URL = '/offline.html'

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

const STATIC_PREFIXES = ['/_next/static/', '/icons/', '/images/']
const STATIC_EXTENSIONS =
  /\.(?:css|js|mjs|html|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|json|webmanifest)$/i

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache
              .add(new Request(url, { cache: 'reload' }))
              .catch(() => undefined)
          )
        )
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith('ecosim-') && key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Auth routes and the Supabase client need live network responses.
  if (url.pathname.startsWith('/auth/')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request))
  }
})

function isStaticAsset(pathname) {
  return (
    STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    STATIC_EXTENSIONS.test(pathname)
  )
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)

    // Treat gateway/server outages like a lost connection. Normal responses,
    // including auth redirects and 4xx pages, keep their usual behavior.
    if (response.status < 500) return response
  } catch {
    // Fall through to the cached offline page.
  }

  const cached = await caches.match(OFFLINE_URL)
  if (cached) return cached

  return new Response('EcoSim is offline.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  const network = fetch(request)
    .then((response) => {
      if (response.ok && response.type === 'basic') {
        cache.put(request, response.clone()).catch(() => undefined)
      }
      return response
    })
    .catch(
      () =>
        cached ||
        new Response('Asset unavailable while offline.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
    )

  return cached || network
}
