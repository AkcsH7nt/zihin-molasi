// Zihin Molası — çevrimdışı çalışma. Dosya değişince SURUM'u artır.
const SURUM = 'zm-2';
const DOSYALAR = ['./', 'index.html', 'mantik.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== SURUM).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    // sayfa: önce internet (güncel sürüm), yoksa kayıtlı kopya
    e.respondWith(fetch(e.request)
      .then(r => { const k = r.clone(); caches.open(SURUM).then(c => c.put('index.html', k)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
