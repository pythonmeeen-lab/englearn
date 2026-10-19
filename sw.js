// ==================================================
// EngLearn — Servis Çalışanı (Service Worker)
// Amaç: PWA / APK için çevrimdışı destek ve yüklenebilirlik.
// Strateji:
//   - Sayfa (HTML) istekleri  -> network-first (güncel içerik)
//   - Statik varlıklar        -> stale-while-revalidate
//   - Dış kaynaklar (font/TTS)-> sadece ağ
// ==================================================

const SURUM = 'englearn-v6';
const ONBELLEK = `onbellek-${SURUM}`;

// index.html ve anasayfa.html bu stil/skriptleri sürüm parametresiyle istiyor.
// Kabuk listesi parametresiz yazılmıştı; bu yüzden tek bir istekle bile
// eşleşmeyip boşa önbellekleme yapıyordu. Artık aynı URL'yi kullanıyoruz.
const S = '?v=50';
const C = '?v=50';
const N = '?v=50';
const K = '?v=50';

// Kabuk dosyaları (ilk kurulumda önbelleğe alınır)
const KABUK = [
    './',
    './anasayfa.html',
    './index.html',
    './manifest.webmanifest',
    `./css/style.css${S}`,
    `./css/anasayfa.css${C}`,
    `./js/nav.js${N}`,
    `./js/pwa.js${C}`,
    `./js/anasayfa.js${K}`,
    `./js/app.js${S}`,
    `./js/listem.js${S}`,
    `./js/dinle.js${S}`,
    `./js/duplikat-temizle.js${S}`,
    `./js/duplikat-ailesi.js${S}`,
    `./js/ai.js${S}`,
    './img/icon-192.png',
    './img/icon-512.png',
    './img/icon-maskable-512.png',
    './img/apple-touch-icon.png',
    './img/favicon-32.png'
];

// Kurulum: kabuğu önbelleğe al
self.addEventListener('install', (olay) => {
    olay.waitUntil(
        caches.open(ONBELLEK).then((onbellek) =>
            Promise.allSettled(KABUK.map((u) => onbellek.add(u)))
        ).then(() => self.skipWaiting())
    );
});

// Etkinleşme: eski önbellekleri temizle
self.addEventListener('activate', (olay) => {
    olay.waitUntil(
        caches.keys().then((anahtarlar) =>
            Promise.all(
                anahtarlar
                    .filter((a) => a !== ONBELLEK)
                    .map((a) => caches.delete(a))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (olay) => {
    const istek = olay.request;
    if (istek.method !== 'GET') return;

    const url = new URL(istek.url);

    // Farklı kaynak (fonts, responsivevoice) -> yalnızca ağ
    if (url.origin !== self.location.origin) {
        return;
    }

    // Sayfa gezinmeleri -> network-first, hata olursa önbellekten
    if (istek.mode === 'navigate') {
        olay.respondWith(
            fetch(istek)
                .then((yanit) => {
                    const kopya = yanit.clone();
                    caches.open(ONBELLEK).then((o) => o.put(istek, kopya));
                    return yanit;
                })
                .catch(() =>
                    caches.match(istek).then((c) => c || caches.match('./anasayfa.html'))
                )
        );
        return;
    }

    // Statik varlıklar -> stale-while-revalidate
    olay.respondWith(
        caches.match(istek).then((onbellekte) => {
            const agdanGetir = fetch(istek)
                .then((yanit) => {
                    if (yanit && yanit.status === 200 && yanit.type === 'basic') {
                        const kopya = yanit.clone();
                        caches.open(ONBELLEK).then((o) => o.put(istek, kopya));
                    }
                    return yanit;
                })
                .catch(() => onbellekte);
            return onbellekte || agdanGetir;
        })
    );
});
