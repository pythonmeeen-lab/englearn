// ==================================================
// EngLearn — Anasayfa Mantığı
// 1) Günün Kelimesi  2) Ses  3) Seri takibi  4) Tema
// ==================================================

/* ==================================================
   TEKRAR AYIKLAMA — aynı yazım + aynı anlamdan biri kalsın
   ================================================== */
(function () {
    if (typeof KELIMELER === 'undefined') return;
    const gidilen = new Set();
    const temiz = [];
    for (let i = 0; i < KELIMELER.length; i++) {
        const k = KELIMELER[i];
        if (!k || typeof k.w !== 'string') { temiz.push(k); continue; }
        const anahtar = k.w.toLowerCase() + '\u0001' + (k.tr || '').toLowerCase();
        if (!gidilen.has(anahtar)) { gidilen.add(anahtar); temiz.push(k); }
    }
    KELIMELER.length = 0;
    Array.prototype.push.apply(KELIMELER, temiz);
})();

document.addEventListener('DOMContentLoaded', () => {
    temaHazirla();
    sesHazirla();
    gundemKelimiGoster();
    seriGuncelle();
    olaylariBagla();
});

/* ==================================================
   TEMA (Dark Mode)
   ================================================== */
function temaHazirla() {
    const btn = document.getElementById('btn-tema');
    if (!btn) return;
    const simgeGuncelle = () => {
        btn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
    };
    btn.addEventListener('click', () => {
        const yeni = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', yeni);
        try { localStorage.setItem('englearn-tema', yeni); } catch (e) {}
        simgeGuncelle();
    });
    simgeGuncelle();
}

/* ==================================================
   SES — ResponsiveVoice (erkek/kadın/otomatik)
   ================================================== */
let seciliCins = 'auto';
function sesHazirla() {
    try {
        const ham = localStorage.getItem('englearn-ses-cins');
        if (ham) {
            const veri = JSON.parse(ham);
            if (['auto', 'erkek', 'kadin'].includes(veri.cins)) seciliCins = veri.cins;
        }
    } catch (e) {}
}

function konus(metin) {
    if (!metin) return;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const temiz = metin.replace(/\//g, '').trim();

    // Erkek → Google UK English Male, diğerleri → Google US English
    const sesAdi = seciliCins === 'erkek' ? 'Google UK English Male' : 'Google US English';
    const tl = seciliCins === 'erkek' ? 'en-GB' : 'en-US';
    const url = 'https://code.responsivevoice.org/getvoice.php?t=' +
        encodeURIComponent(temiz) + '&tl=' + tl + '&sv=g1&vn=' + encodeURIComponent(sesAdi);

    // <audio> ile oynat; başarısız olursa SpeechSynthesis
    try {
        const audio = new Audio(url);
        audio.volume = 1;
        const p = audio.play();
        if (p && p.then) {
            p.catch(() => {
                try {
                    const u = new SpeechSynthesisUtterance(temiz);
                    u.lang = 'en-US';
                    window.speechSynthesis.speak(u);
                } catch (e) {}
            });
        }
    } catch (e) {
        try {
            const u = new SpeechSynthesisUtterance(temiz);
            u.lang = 'en-US';
            window.speechSynthesis.speak(u);
        } catch (e2) {}
    }
}

/* ==================================================
   GÜNÜN KELİMESİ (tarihe bağlı deterministik seçim)
   ================================================== */
function gundemKelimiGoster() {
    if (typeof KELIMELER === 'undefined' || !KELIMELER.length) return;

    // Tarihi bölgeye göre YYYY-AA-GG al
    const bugun = new Date();
    const yil = bugun.getFullYear();
    const ay = String(bugun.getMonth() + 1).padStart(2, '0');
    const gun = String(bugun.getDate()).padStart(2, '0');
    const tarihAnahtari = `${yil}-${ay}-${gun}`;

    // Tarih dizesini sağlam bir şekilde hash'le → tüm listeye dağılmış indeks
    const tarihHash = (s) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) {
            h = (h << 5) - h + s.charCodeAt(i);
            h = h | 0; // 32-bit
        }
        return Math.abs(h);
    };

    // Dünün tarih anahtarını üret (dünle aynı kelime düşmemesi için)
    const dun = new Date(bugun);
    dun.setDate(dun.getDate() - 1);
    const dunAnahtari =
        `${dun.getFullYear()}-${String(dun.getMonth() + 1).padStart(2, '0')}-${String(dun.getDate()).padStart(2, '0')}`;

    // Seçim tamamen TARİHE bağlıdır (ziyaret geçmişinden bağımsız → yenilemede sabit)
    let indeks = tarihHash(tarihAnahtari) % KELIMELER.length;
    const dunIndeks = tarihHash(dunAnahtari) % KELIMELER.length;
    if (indeks === dunIndeks) {
        indeks = (indeks + 1) % KELIMELER.length;   // asla dünün kelimesi olmasın
    }

    const kelime = KELIMELER[indeks];

    // Ekrana yerleştir
    document.getElementById('dwd-kelime').textContent = kelime.w;
    document.getElementById('dwd-telaffuz').textContent = kelime.pr || '';
    document.getElementById('dwd-anlam').textContent = kelime.tr || '';
    document.getElementById('dwd-ornek').textContent = kelime.ex || '';
    document.getElementById('dwd-ornek-tr').textContent = kelime.exTr || '';
    document.getElementById('dwd-seviye').textContent = kelime.lv || '';
    const seviye2 = document.getElementById('dwd-seviye2');
    if (seviye2) seviye2.textContent = kelime.lv || '';
    document.getElementById('dwd-tarih').textContent = `${gun} ${ay} ${yil}`;

    // Günün kelimesini kaydet (seri + dün kontrolü için indeks dahil)
    try {
        localStorage.setItem('englearn-gunun-kelime', JSON.stringify({ tarih: tarihAnahtari, w: kelime.w, indeks: indeks }));
    } catch (e) {}
}

/* ==================================================
   GÜNLÜK SERİ (Streak)
   Tanım: her gün anasayfayı ziyaret → seri 1 artar
   ================================================== */
function seriGuncelle() {
    let seri = 0;
    let sonTarih = null;

    try {
        const kayit = localStorage.getItem('englearn-streak');
        if (kayit) {
            const veri = JSON.parse(kayit);
            seri = veri.seri || 0;
            sonTarih = veri.tarih || null;
        }
    } catch (e) {}

    const bugun = new Date();
    const yil = bugun.getFullYear();
    const ay = String(bugun.getMonth() + 1).padStart(2, '0');
    const gun = String(bugun.getDate()).padStart(2, '0');
    const bugunAnahtari = `${yil}-${ay}-${gun}`;

    if (sonTarih !== bugunAnahtari) {
        // Dün ziyaret edildiyse seriyi artır, değilse sıfırla
        const dun = new Date(bugun);
        dun.setDate(dun.getDate() - 1);
        const dunAnahtari =
            `${dun.getFullYear()}-${String(dun.getMonth() + 1).padStart(2, '0')}-${String(dun.getDate()).padStart(2, '0')}`;
        seri = sonTarih === dunAnahtari ? seri + 1 : 1;
        try {
            localStorage.setItem('englearn-streak', JSON.stringify({ seri: seri, tarih: bugunAnahtari }));
        } catch (e) {}
    }

    const el = document.getElementById('dwd-streak');
    if (el) {
        el.innerHTML = seri > 0 ? `🔥 Seri: <b>${seri}</b> gün` : `🔥 Seri: <b>0</b> gün — bugün başla!`;
    }
}

/* ==================================================
   OLAYLAR
   ================================================== */
function olaylariBagla() {
    // Flip kart — karta tıkla, çevrilsin
    const flash = document.getElementById('dwd-flash');
    if (flash) {
        flash.addEventListener('click', () => flash.classList.toggle('flipped'));
    }

    const sesKelime = document.getElementById('dwd-ses-kelime');
    const sesCumle = document.getElementById('dwd-ses-cumle');
    if (sesKelime) {
        sesKelime.addEventListener('click', (e) => {
            e.stopPropagation(); // kart çevrilmesin
            konus(document.getElementById('dwd-kelime').textContent);
        });
    }
    if (sesCumle) {
        sesCumle.addEventListener('click', (e) => {
            e.stopPropagation(); // kart çevrilmesin
            konus(document.getElementById('dwd-ornek').textContent);
        });
    }
}
