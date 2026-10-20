// ==================================================
// EngLearn — Servis Çalışanı (Service Worker)
// Amaç: PWA / APK için çevrimdışı destek ve yüklenebilirlik.
// Strateji:
//   - Sayfa (HTML) istekleri  -> network-first (güncel içerik)
//   - Statik varlıklar        -> stale-while-revalidate
//   - Dış kaynaklar (font/TTS)-> sadece ağ
// ==================================================

const SURUM = 'englearn-v8';
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

// Kurulum: kabuğu VE sayfaların kullandığı TÜM varlığı (tüm veri dosyaları
// dahil ~1MB) önbelleğe al. Telefona kurulumda site artık EKSİKSİZ iner.
function sayfaKaynaklari(html) {
    const liste = [];
    const re = /(?:src|href)="([^"]+)"/g;
    let m;
    while ((m = re.exec(html))) {
        const p = m[1];
        if (!p || p[0] === '#' || p.indexOf('//') === 0 || /^https?:/i.test(p)) continue;
        const uzsuz = p.split('?')[0];
        if (!/\.(js|css|png|jpg|jpeg|webp|svg|ico|webmanifest|woff2?|ttf)$/i.test(uzsuz)) continue;
        liste.push(p);
    }
    return liste;
}
async function tumunuOnbellekle(onbellek) {
    const urls = new Set(KABUK);
    for (const s of ['./index.html', './anasayfa.html']) {
        try {
            const r = await fetch(s);
            for (const u of sayfaKaynaklari(await r.text())) urls.add(u);
        } catch (e) {}
    }
    await onbellekGrup(onbellek, [...urls]);
    return { toplam: [...urls].length };
}
async function onbellekAl(onbellek, u, deneme) {
    deneme = deneme || 3;
    for (var i = 0; i < deneme; i++) {
        try {
            var y = await fetch(u);
            if (y && (y.ok || y.type === 'opaque')) { await onbellek.put(u, y); return true; }
        } catch (e) {
            await new Promise(function (r) { setTimeout(r, 500 * (i + 1)); });
        }
    }
    return false;
}
async function onbellekGrup(onbellek, liste) {
    var grup = 8; // mobilde cok istek patlamasin
    for (var i = 0; i < liste.length; i += grup) {
        await Promise.all(liste.slice(i, i + grup).map(function (u) { return onbellekAl(onbellek, u); }));
    }
}
self.addEventListener('install', (olay) => {
    olay.waitUntil(
        caches.open(ONBELLEK)
            .then((onbellek) => tumunuOnbellekle(onbellek))
            .then(() => self.skipWaiting())
    );
});
// Sayfa "tamir" isterse eksikleri yeniden cek
self.addEventListener('message', (olay) => {
    if (olay.data && olay.data.tip === 'tamir') {
        olay.waitUntil(
            caches.open(ONBELLEK).then((o) => tumunuOnbellekle(o)).then((r) => {
                if (olay.source) olay.source.postMessage({ tip: 'tamir', son: r });
            })
        );
    }
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
        ).then(() => self.clients.claim()).then(() => {
            // Kurulumda kacanlari arka planda tamir et (engellemeden)
            caches.open(ONBELLEK).then((o) => tumunuOnbellekle(o)).catch(() => {});
        })
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
