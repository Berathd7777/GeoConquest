// Çevrimdışı yetenekleri için Service Worker

const CACHE_NAME = 'geoconquest-cache-v1';
const APP_SHELL_URLS = [
    './index.html',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/@turf/turf@6/turf.min.js',
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js'
];

// 1. Yükleme: Uygulama kabuğunu (App Shell) önbelleğe al
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: App Shell önbelleğe alınıyor');
                return cache.addAll(APP_SHELL_URLS);
            })
    );
});

// 2. Aktifleştirme: Eski önbellekleri temizle (opsiyonel ama iyi bir pratik)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Eski önbellek temizleniyor', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. Fetch: Ağ isteklerini yakala ve önbellekten sun
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Harita karoları için özel strateji (Cache-First, then Network)
    if (requestUrl.hostname.includes('tile.openstreetmap.org') || requestUrl.hostname.includes('server.arcgisonline.com')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    // Önbellekte varsa, oradan sun
                    if (response) {
                        return response;
                    }
                    // Önbellekte yoksa, ağdan çek, sayfaya gönder ve önbelleğe ekle
                    return fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // Diğer tüm istekler için (App Shell) Cache-First stratejisi
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Önbellekte varsa oradan sun, yoksa ağdan çek
                return response || fetch(event.request);
            })
    );
});