const CACHE_NAME = 'climat-control-v4';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/main.css',
    '/js/main.js',
    '/js/cart.js',
    '/js/products.js',
    '/js/marketing.js',
    '/js/content-config.js',
    '/components/header.html',
    '/components/hero.html',
    '/components/services.html',
    '/components/products.html',
    '/components/contacts.html',
    '/components/portfolio.html',
    '/components/footer.html',
    '/components/cart.html'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});