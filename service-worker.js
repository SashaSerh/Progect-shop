const CACHE_NAME = 'climat-control-v30';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/main.css',
    '/js/main.js',
    '/js/cart.js',
    '/js/products.js',
    '/js/marketing.js',
    '/js/content-config.js',
    '/js/i18n.js',
    '/js/theme.js',
    '/components/header.html',
    '/components/hero.html',
    '/components/services.html',
    '/components/products.html',
    '/components/product-detail.html',
    '/components/contacts.html',
    '/components/portfolio.html',
    '/components/footer.html',
    '/components/cart.html',
    '/offline.html',
    '/robots.txt',
    '/sitemap.xml'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// Notify clients when a new SW takes control and clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(async () => {
            const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
            clientsList.forEach(client => client.postMessage({ type: 'SW_ACTIVATED' }));
            return self.clients.claim();
        })
    );
});

// Network-first for navigations; cache-first for static assets
self.addEventListener('fetch', event => {
    const req = event.request;
    // HTML navigation requests
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then(res => {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, resClone)).catch(() => {});
                    return res;
                })
                .catch(async () => {
                    const cache = await caches.open(CACHE_NAME);
                    const cached = await cache.match(req);
                    return cached || cache.match('/offline.html');
                })
        );
        return;
    }
    // For other requests: try cache, then network
    event.respondWith(
        caches.match(req).then(cached => cached || fetch(req).then(res => {
            // Put a copy in cache for future
            const resClone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, resClone)).catch(() => {});
            return res;
        }).catch(() => cached))
    );
});

// (single activate listener above)