// Zihin Molası — çevrimdışı çalışma. Dosya değişince SURUM'u artır.
const SURUM = 'zm-10';
const DOSYALAR = ['./', 'index.html', 'mantik.js', 'kelimeler.js', 'fonts/fredoka-latin-wght-normal.woff2', 'fonts/fredoka-latin-ext-wght-normal.woff2', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== SURUM).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Önce internet (sayfa ve betikler hep birlikte güncel kalsın), yoksa kayıtlı kopya.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const nav = e.request.mode === 'navigate';
  // cache:'no-cache' → tarayıcının HTTP önbelleği de sunucuya sorar; eski betik yeni sayfayla karışmaz
  // (navigate isteği init ile kopyalanamaz; bu yüzden adresle istenir)
  e.respondWith(fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })
    .then(r => {
      if (r.ok) { const k = r.clone(); e.waitUntil(caches.open(SURUM).then(c => c.put(nav ? 'index.html' : e.request, k))); }
      return r;
    })
    .catch(() => caches.match(nav ? 'index.html' : e.request, { ignoreSearch: true })));
});
