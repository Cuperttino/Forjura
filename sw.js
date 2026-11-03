// Sube el número de versión al publicar cambios en imágenes o iconos.
const CACHE = 'hierro-v3';
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "img/gym-0.jpg",
  "img/gym-1.jpg",
  "img/gym-2.jpg",
  "img/gym-3.jpg",
  "img/gym-4.jpg",
  "img/gym-5.jpg",
  "img/gym-6.jpg",
  "img/gym-7.jpg",
  "img/gym-8.jpg"
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Puter y el resto de servicios externos van siempre a la red; nunca se guardan copias de sus respuestas.
  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  if (!own && url.hostname !== 'fonts.googleapis.com' && url.hostname !== 'fonts.gstatic.com') return;
  // La página se pide primero a la red para recibir las novedades; sin conexión se usa la copia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req.url, { cache: 'no-cache' }).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('index.html', copy));
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }
  // Imágenes, iconos y fuentes: primero la copia guardada.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
