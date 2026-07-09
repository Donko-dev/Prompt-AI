// Service Worker PROMPTAI
// Rôle : (1) permettre l'installation PWA (Chrome/Android exige un SW actif), (2) mettre en
// cache les fichiers de l'app pour un fonctionnement 100% hors-ligne après la première visite.
// Tout appel vers un autre domaine (ex: FedaPay) passe directement au réseau, sans mise en cache,
// car le paiement nécessite de toute façon une connexion.

const CACHE_NAME = 'promptai-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './favicon-16.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(ASSETS_TO_CACHE); })
      .catch(function (err) { console.warn('SW: mise en cache initiale partielle', err); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // laisse passer FedaPay et tout appel externe tel quel

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var network = fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function () { return cached; });
      // Cache d'abord si disponible (rapide, fonctionne hors-ligne), sinon réseau.
      return cached || network;
    })
  );
});
