// ==================================================
// EngLearn — Uygulama Mantığı
// 1) Kelime Kartları  2) Cümle Oluşturma  3) Ses
// ==================================================

/* ==================================================
   TEKRAR AYIKLAMA — aynı yazım + aynı anlamdan biri kalsın
   (gerçek kelime sayısını göstermek için)
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

/* ==================================================
   SESLENDİRME — Çok Katmanlı (Akıllı Ses Seçimi)
   1) SpeechSynthesis + en kaliteli İngilizce ses
   2) Google TTS (translate_tts) — yüksek doğallık
   3) Son çare: varsayılan SpeechSynthesis sesi
   ================================================== */
const ses = {
    // Uluslararası kalite tercihi — en doğal/insani sesler önce
    erkekSesOncelik: [
        'google uk english male', 'google us english',
        'microsoft guy', 'microsoft david', 'microsoft mark', // Edge/Windows erkek sesler
        'daniel', 'alex', 'fred', 'tom', 'george',            // macOS / diğer erkek sesler
    ],
    kadinSesOncelik: [
        'google uk english female', 'google us english',
        'microsoft aria', 'microsoft jenny', 'microsoft zira', // Edge/Windows kadın sesler
        'samantha', 'karen', 'victoria', 'moira', 'tessa',     // macOS / diğer kadın sesler
    ],
    erkekSesIpuclari: ['male', 'david', 'mark', 'guy', 'daniel', 'alex', 'fred', 'tom', 'george', 'ryan', 'eric', 'matthew', 'oliver'],
    kadinSesIpuclari: ['female', 'zira', 'aria', 'jenny', 'samantha', 'karen', 'victoria', 'moira', 'tessa', 'susan', 'kate'],

    seciliCins: 'auto', // auto | erkek | kadin
    kayitAnahtari: 'englearn-ses-cins',

    // Play/stop toggle için durum
    aktifMetin: null,   // şu an okutulan temizlenmiş metin
    cihaz: null,        // aktif <audio> elemanı

    // Tercihi kaydet
    cinsBelirle(cins) {
        this.seciliCins = cins;
        try {
            localStorage.setItem(this.kayitAnahtari, JSON.stringify({ cins: cins }));
        } catch (e) { /* sessizce geç */ }
    },

    cinsYukle() {
        try {
            const ham = localStorage.getItem(this.kayitAnahtari);
            if (ham) {
                const veri = JSON.parse(ham);
                if (['auto', 'erkek', 'kadin'].includes(veri.cins)) this.seciliCins = veri.cins;
            }
        } catch (e) { /* bozuk veriye takılma */ }
    },

    enIyiIngilizceSes() {
        const sesler = window.speechSynthesis.getVoices();
        if (!sesler.length) return null;

        // İngilizce sesleri ayır
        const ingilizce = sesler.filter((v) => v.lang.startsWith('en'));
        if (!ingilizce.length) return null;

        // Cinsiyet tercihi varsa ona uygun erkek/kadın ses bul
        if (this.seciliCins === 'erkek') {
            const erkek = this.erkekSesBul(ingilizce);
            if (erkek) return erkek;
            // Erkek ses bulunamadı → otomatik mantığa düş
        } else if (this.seciliCins === 'kadin') {
            const kadin = this.kadinSesBul(ingilizce);
            if (kadin) return kadin;
        }

        // (Otomatik veya cinsiyet bulunamadı) kalite listesinden ara
        const kaliteListesi = [...this.kadinSesOncelik, ...this.erkekSesOncelik];
        for (const ad of kaliteListesi) {
            const bulunan = ingilizce.find((v) => v.name.toLowerCase().includes(ad));
            if (bulunan) return bulunan;
        }

        // en-US önce, sonra en-GB, sonra herhangi İngilizce
        return (
            ingilizce.find((v) => v.lang === 'en-US') ||
            ingilizce.find((v) => v.lang === 'en-GB') ||
            ingilizce[0]
        );
    },

    erkekSesBul(sesler) {
        // 1) Kalite listesindeki erkek adları
        for (const ad of this.erkekSesOncelik) {
            const bulunan = sesler.find((v) => v.name.toLowerCase().includes(ad));
            if (bulunan) return bulunan;
        }
        // 2) Adında erkek ipucu olan
        for (const ipucu of this.erkekSesIpuclari) {
            const bulunan = sesler.find((v) => v.name.toLowerCase().includes(ipucu));
            if (bulunan) return bulunan;
        }
        return null;
    },

    kadinSesBul(sesler) {
        // 1) Kalite listesindeki kadın adları
        for (const ad of this.kadinSesOncelik) {
            const bulunan = sesler.find((v) => v.name.toLowerCase().includes(ad));
            if (bulunan) return bulunan;
        }
        // 2) Adında kadın ipucu olan
        for (const ipucu of this.kadinSesIpuclari) {
            const bulunan = sesler.find((v) => v.name.toLowerCase().includes(ipucu));
            if (bulunan) return bulunan;
        }
        return null;
    },

    konus(metin, hiz = 1) {
        if (!metin) return;
        const metniTemizle = metin.replace(/\//g, '').trim(); // IPA işaretlerini at

        // Aynı metin şu an çalıyorsa → durdur (toggle), baştan başlatma
        if (this.caliyorMu() && this.aktifMetin === metniTemizle) {
            this.durdur();
            return;
        }

        // Başka ses çalıyorsa önce sıfırla, sonra yeni metni en baştan çal
        this.durdur();
        this.aktifMetin = metniTemizle;

        // Google TTS gerçek İngilizce telaffuzu verir ve doğaldır.
        // 1) ÖNCE Google TTS dene → başarısız olursa kendi yerel fallback'i çağırır.
        this.googleTTS(metniTemizle, hiz);
    },

    // Hâlâ çalan bir ses var mı?
    caliyorMu() {
        try {
            if (this.cihaz && !this.cihaz.paused && !this.cihaz.ended) return true;
        } catch (e) {}
        try {
            if ('speechSynthesis' in window && window.speechSynthesis.speaking) return true;
        } catch (e) {}
        return false;
    },

    // Çalan sesi durdur ve sıfırla
    durdur() {
        try {
            if (this.cihaz) {
                this.cihaz.pause();
                try { this.cihaz.currentTime = 0; } catch (e) {}
                this.cihaz = null;
            }
        } catch (e) {}
        try {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        } catch (e) {}
        this.aktifMetin = null;
    },

    // Erkek sesi: ResponsiveVoice Google UK English Male (gerçek erkek İngilizce)
    // Kadın/Otomatik: ResponsiveVoice Google US English (net kadın İngilizce)
    // ResponsiveVoice ücretsizdir ve translate_tts gibi engellenmez.
    googleTTS(metin, hiz = 1) {
        try {
            if (metin.length > 200) metin = metin.slice(0, 200); // sınır

            const basarisizFallback = () => this.fallbackKonus(metin, hiz);

            // Erkek seçiliyse → Google UK English Male (erkek ses)
            if (this.seciliCins === 'erkek') {
                this.responsiveVoiceKonus('Google UK English Male', 'en-GB', metin, hiz);
                return;
            }
            // Kadın seçiliyse → Google US English (kadın ses)
            if (this.seciliCins === 'kadin') {
                this.responsiveVoiceKonus('Google US English', 'en-US', metin, hiz);
                return;
            }
            // Otomatik → en kaliteli genel ses
            this.responsiveVoiceKonus('Google US English', 'en-US', metin, hiz);
        } catch (e) {
            this.fallbackKonus(metin, hiz);
        }
    },

    // ResponsiveVoice — ücretsiz, engellenmeyen TTS servisi.
    // vn = ses adı (Google UK English Male = erkek, Google US English = kadın)
    responsiveVoiceKonus(vn, tl, metin, hiz = 1) {
        try {
            if (metin.length > 200) metin = metin.slice(0, 200);
            const url =
                'https://code.responsivevoice.org/getvoice.php?t=' +
                encodeURIComponent(metin) +
                '&tl=' + tl +
                '&sv=g1' +
                '&vn=' + encodeURIComponent(vn);

            const basarisizFallback = () => this.fallbackKonus(metin, hiz);

            // Yöntem 1: <audio src>
            try {
                const audio = new Audio(url);
                audio.volume = 1;
                this.cihaz = audio; // durdurmak için takip et
                audio.addEventListener('ended', () => {
                    if (this.cihaz === audio) this.cihaz = null;
                });
                audio.addEventListener('pause', () => {
                    // kullanıcı/durdur → aktif ise temizle
                });
                let tamam = false;
                const bitir = (ok) => {
                    if (tamam) return;
                    tamam = true;
                    if (!ok) basarisizFallback();
                };
                audio.addEventListener('error', () => bitir(false));
                audio.addEventListener('canplay', () => bitir(true));
                audio.addEventListener('stalled', () => setTimeout(() => bitir(false), 3000));
                const p = audio.play();
                if (p && p.then) p.then(() => {}).catch(() => bitir(false));
                setTimeout(() => {
                    if (!tamam && !audio.paused) bitir(true);
                }, 4000);
            } catch (e) {
                // Yöntem 2: fetch + blob
                fetch(url)
                    .then((res) => res.blob())
                    .then((blob) => {
                        const blobUrl = URL.createObjectURL(blob);
                        const audio = new Audio(blobUrl);
                        audio.volume = 1;
                        this.cihaz = audio;
                        audio.addEventListener('ended', () => {
                            if (this.cihaz === audio) this.cihaz = null;
                        });
                        audio.play().catch(basarisizFallback);
                        URL.revokeObjectURL(blobUrl);
                    })
                    .catch(basarisizFallback);
            }
        } catch (e) {
            this.fallbackKonus(metin, hiz);
        }
    },

    // Son çare: tarayıcının ses motoru (SpeechSynthesis) — cinsiyet tercihine duyarlı
    fallbackKonus(metin, hiz = 1) {
        try {
            const sesSecimi = this.enIyiIngilizceSes();
            const u = new SpeechSynthesisUtterance(metin);
            u.lang = sesSecimi ? sesSecimi.lang : 'en-US';
            u.rate = hiz;
            if (sesSecimi) u.voice = sesSecimi;
            window.speechSynthesis.speak(u);
        } catch (e) { /* susturucu */ }
    }
};

/* ==================================================
   HASH → PANEL: anasayfa/harici bağlantıdan gelen
   #modül, sayfa açılır açılmaz doğrudan o panele gider
   ================================================== */
function hashPanelAc() {
    const h = (window.location.hash || '').replace('#', '');
    if (!h) return;
    const panel = document.getElementById(h);
    if (!panel) return;
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active-panel', p.id === h));
    document.querySelectorAll('.nav-links a').forEach((l) => {
        const hedef = (l.getAttribute('href') || '').split('#')[1] || '';
        l.classList.toggle('active', hedef === h);
    });
    if (h === 'deyimler' && typeof DeyimUygulamasi !== 'undefined' && DeyimUygulamasi.turSec) {
        try { DeyimUygulamasi.turSec('deyim'); } catch (e) {}
    }
    if (h === 'yanlislar' && typeof YanlislarUygulamasi !== 'undefined') {
        try { YanlislarUygulamasi.ciz(); } catch (e) {}
    }
    try { panel.scrollIntoView({ behavior: 'auto', block: 'start' }); } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    // Ses listesinin yüklenmesini tetikle (bazı tarayıcılar geç yükler)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    temaHazirla();
    sesSeciciHazirla();
    KartUygulamasi.baslat();
    CumleUygulamasi.baslat();
    QuizUygulamasi.baslat();
    YazmaUygulamasi.baslat();
    OkumaUygulamasi.baslat();
    MeaningV2Uygulamasi.baslat();
    EsAnlamUygulamasi.baslat();
    ZitAnlamUygulamasi.baslat();
    SozlukUygulamasi.baslat();
    PhrasalUygulamasi.baslat();
    KosuUygulamasi.baslat();
    YanlislarUygulamasi.baslat();
    if (typeof SrsUygulamasi !== 'undefined') SrsUygulamasi.baslat();
    if (typeof KisiselPanel !== 'undefined') KisiselPanel.baslat();
    if (typeof Ogretmen !== 'undefined') Ogretmen.baslat();
    if (typeof DuzensizFiillerUygulamasi !== 'undefined') DuzensizFiillerUygulamasi.baslat();
    if (typeof SiteKoruma !== 'undefined') SiteKoruma.baslat();
    if (typeof DeyimUygulamasi !== 'undefined') DeyimUygulamasi.baslat();

    // Sözlük altyazısındaki kelime sayısı elle yazılmaktaydı ve bayatlamıştı;
    // artık gerçek veriden (KELIMELER) yuvarlanarak doldurulur.
    const sozlukSayi = document.getElementById('sozluk-kelime-sayisi');
    if (sozlukSayi && typeof KELIMELER !== 'undefined' && KELIMELER.length) {
        sozlukSayi.textContent = Math.floor(KELIMELER.length / 100) * 100;
    }

    navHazirla();
    // Harici bağlantıdan gelen #modül ise doğrudan aç (anasayfa/menü)
    window.addEventListener('hashchange', hashPanelAc);
    hashPanelAc();
});

/* ==================================================
   TEMA (Dark Mode) Düğmesi
   ================================================== */
function temaHazirla() {
    const btn = document.getElementById('btn-tema');
    if (!btn) return;

    // Mevcut temayı düğme simgesine yansıt
    const simgeGuncelle = () => {
        const karanlik = document.documentElement.getAttribute('data-theme') === 'dark';
        btn.textContent = karanlik ? '☀️' : '🌙';
    };

    btn.addEventListener('click', () => {
        const simdiki = document.documentElement.getAttribute('data-theme') === 'dark';
        const yeni = simdiki ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', yeni);
        try {
            localStorage.setItem('englearn-tema', yeni);
        } catch (e) { /* sessizce geç */ }
        simgeGuncelle();
    });

    simgeGuncelle();
}

/* ==================================================
   SES SEÇİCİ (Otomatik / Erkek / Kadın)
   ================================================== */
function sesSeciciHazirla() {
    ses.cinsYukle();
    const cipleri = document.querySelectorAll('.ses-chip');
    const btnTest = document.getElementById('btn-ses-test');

    // Kayıtlı tercihi yansıt
    cipleri.forEach((c) => c.classList.toggle('active', c.dataset.cins === ses.seciliCins));

    cipleri.forEach((chip) => {
        chip.addEventListener('click', () => {
            cipleri.forEach((c) => c.classList.remove('active'));
            chip.classList.add('active');
            ses.cinsBelirle(chip.dataset.cins);
        });
    });

    // Test butonu — seçili sesi "Hello, nice to meet you" ile dener
    if (btnTest) {
        btnTest.addEventListener('click', () => {
            ses.konus('Hello, nice to meet you. This is how I sound.');
        });
    }
}

/* ==================================================
   NAVİGASYON (Sekme Geçişi)
   ================================================== */
function navHazirla() {
    const linkler = document.querySelectorAll('.nav-links a');
    const paneller = document.querySelectorAll('.panel');

    linkler.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const hedef = link.getAttribute('href');

            linkler.forEach((l) => l.classList.remove('active'));
            link.classList.add('active');

            paneller.forEach((p) => {
                p.classList.toggle('active-panel', p.id === hedef.slice(1));
            });
            // Modüle geçerken panelin başına kaydır (sticky menünün altında kalma)
            const panelHedef = document.getElementById(hedef.slice(1));
            if (panelHedef) panelHedef.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // "Yanlışlarım" paneli her açılışta taze veriden yeniden çizilsin
            if (hedef === '#yanlislar' && typeof YanlislarUygulamasi !== 'undefined') {
                YanlislarUygulamasi.ciz();
                YanlislarUygulamasi.rozetGuncelle();
            }

            // "Deyimler" / "Atasözleri": kendi panelinde, seçili türle aç
            if (link.dataset.tur && typeof DeyimUygulamasi !== 'undefined') {
                DeyimUygulamasi.turSec(link.dataset.tur);
                const panel = document.getElementById('deyimler');
                if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/* ==================================================
   1) KELİME KARTLARI
   ================================================== */
const KartUygulamasi = {
    liste: [],
    indeks: 0,
    bilinen: new Set(),
    tekrar: new Set(),
    kayitAnahtari: 'englearn-bilinen', // localStorage anahtarı

    kaydet() {
        // İlerlemeyi tarayıcıya kaydet
        try {
            localStorage.setItem(this.kayitAnahtari, JSON.stringify({
                bilinen: [...this.bilinen],
                tekrar: [...this.tekrar]
            }));
        } catch (e) { /* localStorage engellenmişse sessizce geç */ }
    },

    yukle() {
        try {
            const ham = localStorage.getItem(this.kayitAnahtari);
            if (!ham) return;
            const veri = JSON.parse(ham);
            this.bilinen = new Set(veri.bilinen || []);
            this.tekrar = new Set(veri.tekrar || []);
        } catch (e) { /* bozuk veriye takılma */ }
    },

    // Filtreler
    seciliSeviye: 'all',
    seciliKategori: 'all',

    baslat() {
        this.yukle(); // kayıtlı ilerlemeyi geri getir
        this.liste = [...KELIMELER];
        this.karistir(); // her sayfa yenilemede ana ekrana farklı kelime gelsin
        this.filtreHazirla();
        this.kartGoster();
        this.istatistikGuncelle();

        // Kartın çevrilmesi
        const kart = document.getElementById('flashcard');
        kart.addEventListener('click', () => kart.classList.toggle('flipped'));

        // Seslendirme butonları
        document.getElementById('btn-ses-kelime').addEventListener('click', (e) => {
            e.stopPropagation(); // kartı çevirme tetiklenmesin
            ses.konus(this.liste[this.indeks].w);
        });
        document.getElementById('btn-ses-cumle').addEventListener('click', (e) => {
            e.stopPropagation();
            ses.konus(this.liste[this.indeks].ex);
        });

        document.getElementById('btn-gerial').addEventListener('click', () => this.geri());
        document.getElementById('btn-ileri').addEventListener('click', () => this.ileri());
        document.getElementById('btn-karistir').addEventListener('click', () => this.karistir());

        document.getElementById('btn-biliyorum').addEventListener('click', () => this.isaretle(true));
        document.getElementById('btn-bilmiyorum').addEventListener('click', () => this.isaretle(false));

        const fav = document.getElementById('btn-favori');
        if (fav) fav.addEventListener('click', () => {
            if (typeof FavorilerUygulamasi === 'undefined' || !this.liste.length) return;
            const k = this.liste[Math.min(this.indeks, this.liste.length - 1)];
            FavorilerUygulamasi.cekCevir(k);
            FavorilerUygulamasi.kartButon(k);
            FavorilerUygulamasi.rozet();
        });

        document.getElementById('btn-sifirla').addEventListener('click', () => {
            if (confirm('Tüm ilerlemeniz silinecek. Emin misiniz?')) {
                this.bilinen.clear();
                this.tekrar.clear();
                localStorage.removeItem(this.kayitAnahtari);
                this.istatistikGuncelle();
            }
        });
    },

    filtreHazirla() {
        // Seviye çipleri
        const seviyeCipleri = document.querySelectorAll('#seviye-filtre .chip');
        const secici = document.getElementById('kategori-filtre');

        // Kategori listesini güncelle (seçili seviyeye göre)
        const kategorileriYenile = () => {
            const mevcut = secici.value;
            // Seçili seviyeye uygun kelime havuzu
            const adaylar = this.seciliSeviye === 'all'
                ? KELIMELER
                : KELIMELER.filter((k) => k.lv === this.seciliSeviye);
            const kategoriler = [...new Set(adaylar.map((k) => k.ct))].sort();
            secici.innerHTML = '<option value="all">Tüm Kategoriler</option>';
            kategoriler.forEach((kat) => {
                const opt = document.createElement('option');
                opt.value = kat;
                opt.textContent = kat.charAt(0).toUpperCase() + kat.slice(1);
                secici.appendChild(opt);
            });
            // Önceki seçim hâlâ geçerliyse koru, yoksa 'all'
            this.seciliKategori = kategoriler.includes(mevcut) ? mevcut : 'all';
            secici.value = this.seciliKategori;
        };

        seviyeCipleri.forEach((chip) => {
            chip.addEventListener('click', () => {
                seviyeCipleri.forEach((c) => c.classList.remove('active'));
                chip.classList.add('active');
                this.seciliSeviye = chip.dataset.value;
                kategorileriYenile();
                this.uydur();
            });
        });

        // Kategori seçimi (ilk doldurma)
        kategorileriYenile();
        secici.addEventListener('change', () => {
            this.seciliKategori = secici.value;
            this.uydur();
        });
    },

    uydur() {
        this.liste = KELIMELER.filter((k) => {
            const seviyeUygun = this.seciliSeviye === 'all' || k.lv === this.seciliSeviye;
            const kategoriUygun = this.seciliKategori === 'all' || k.ct === this.seciliKategori;
            return seviyeUygun && kategoriUygun;
        });
        this.indeks = 0;
        this.kartGoster();
        this.istatistikGuncelle();
    },

    kartGoster() {
        const kart = document.getElementById('flashcard');
        kart.classList.remove('flipped'); // yeni kartta ön yüz açılır

        if (this.liste.length === 0) {
            this.bosGoster();
            return;
        }

        const k = this.liste[Math.min(this.indeks, this.liste.length - 1)];

        document.getElementById('kart-kelime').textContent = k.w;
        document.getElementById('kart-telaffuz').textContent = k.pr || '';
        document.getElementById('kart-anlam').textContent = k.tr || '';
        document.getElementById('kart-ornek').textContent = k.ex || '';
        document.getElementById('kart-ornek-tr').textContent = k.exTr || '';
        const kartForm = document.getElementById('kart-formlar');
        if (kartForm) { const t = FiilCekim.metin(k); kartForm.innerHTML = t; kartForm.classList.toggle('hidden', !t); }
        document.getElementById('kart-seviye').textContent = k.lv || '';
        document.getElementById('kart-seviye2').textContent = k.lv || '';
        document.getElementById('kart-kategori').textContent = k.ct || '';

        // Sayac ve ilerleme
        const toplam = this.liste.length;
        const sira = this.indeks + 1;
        document.getElementById('kart-sayac').textContent = `${sira} / ${toplam}`;
        document.getElementById('progress-dolgu').style.width = `${(sira / toplam) * 100}%`;

        // Favori butonu durumu
        if (typeof FavorilerUygulamasi !== 'undefined') FavorilerUygulamasi.kartButon(k);
    },

    bosGoster() {
        document.getElementById('kart-kelime').textContent = 'Sonuç yok';
        document.getElementById('kart-telaffuz').textContent = '';
        document.getElementById('kart-anlam').textContent = 'Bu filtre ile kelime bulunamadı';
        document.getElementById('kart-ornek').textContent = '';
        document.getElementById('kart-ornek-tr').textContent = '';
        document.getElementById('kart-seviye').textContent = '';
        document.getElementById('kart-seviye2').textContent = '';
        document.getElementById('kart-sayac').textContent = '0 / 0';
        document.getElementById('progress-dolgu').style.width = '0%';
    },

    geri() {
        if (this.indeks > 0) {
            this.indeks--;
            this.kartGoster();
        }
    },

    ileri() {
        if (this.indeks < this.liste.length - 1) {
            this.indeks++;
            this.kartGoster();
        } else {
            SiteKoruma.toast('🎉 Tebrikler! Bu listedeki tüm kartları gördünüz. Sıradaki liste için "Biliyorum/Bilmiyorum" ile işaretleyip devam edin!');
        }
    },

    karistir() {
        // Fisher-Yates karıştırma
        for (let i = this.liste.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.liste[i], this.liste[j]] = [this.liste[j], this.liste[i]];
        }
        this.indeks = 0;
        this.kartGoster();
    },

    isaretle(biliyorMu) {
        const k = this.liste[this.indeks];
        if (!k) return;

        if (biliyorMu) {
            this.bilinen.add(k.w);
            this.tekrar.delete(k.w);
            // Öğrenildi → "Yanlışlarım"dan bu kelimeyi düşür
            if (typeof YanlisKaydedici !== 'undefined') {
                YanlisKaydedici.sil('kart|' + k.w);
                if (typeof YanlislarUygulamasi !== 'undefined') YanlislarUygulamasi.rozetGuncelle();
            }
        } else {
            this.tekrar.add(k.w);
            this.bilinen.delete(k.w);
            // "Bilmiyorum" → "Yanlışlarım"a kaydet
            if (typeof YanlisKaydedici !== 'undefined') {
                YanlisKaydedici.kaydet({
                    id: 'kart|' + k.w,
                    tip: 'kart',
                    kelime: k.w,
                    verdi: '',
                    dogru: k.tr
                });
            }
        }
        // Akıllı tekrar: "Biliyorum" → iyi(4), "Bilmiyorum" → görmedim(0)
        if (typeof AkilliTekrar !== 'undefined') {
            AkilliTekrar.cevapla({ w: k.w, tr: k.tr, lv: k.lv, ct: k.ct, pr: k.pr }, biliyorMu ? 4 : 0);
            if (typeof SrsUygulamasi !== 'undefined') SrsUygulamasi.rozetGuncelle();
        }
        this.kaydet(); // ilerlemeyi kaydet
        this.istatistikGuncelle();
        this.ileri();
    },

    istatistikGuncelle() {
        document.getElementById('stat-toplam').textContent = KELIMELER.length;
        document.getElementById('stat-bilinen').textContent = this.bilinen.size;
        document.getElementById('stat-tekrar').textContent = this.tekrar.size;
    }
};

/* ==================================================
   FİİL ÇEKİMLERİ (V2 / V3 / -ing) gösterimi
   ================================================== */
const FiilCekim = {
    ingYap(w) {
        w = w.toLowerCase();
        if (w === 'be') return 'being';
        if (w.endsWith('ie')) return w.slice(0, -2) + 'ying';
        if (w.endsWith('e') && !w.endsWith('ee')) return w.slice(0, -1) + 'ing';
        if (/[^aeiou][aeiou][^aeiouwxy]$/.test(w)) return w + w.slice(-1) + 'ing';
        return w + 'ing';
    },
    duzenli(w) {
        const e = w.toLowerCase();
        if (e.endsWith('e')) return { v2: e + 'd', v3: e + 'd' };
        if (/[^aeiou]y$/.test(e)) return { v2: e.slice(0, -1) + 'ied', v3: e.slice(0, -1) + 'ied' };
        if (/[^aeiou][aeiou][^aeiouwxy]$/.test(e)) { const d = e.slice(-1); return { v2: e + d + 'ed', v3: e + d + 'ed' }; }
        return { v2: e + 'ed', v3: e + 'ed' };
    },
    metin(k) {
        if (!k || !k.w) return '';
        const ir = (typeof DUZENSIZ_FIILLER !== 'undefined')
            ? DUZENSIZ_FIILLER.find((f) => f.v1.toLowerCase() === k.w.toLowerCase()) : null;
        if (k.ct !== 'fiiller' && !ir) return '';
        let v2, v3;
        if (ir) { v2 = ir.v2; v3 = ir.v3; }
        else { const d = this.duzenli(k.w); v2 = d.v2; v3 = d.v3; }
        return `Geçmiş (V2): <b>${v2}</b> · Participle (V3): <b>${v3}</b> · Şimdiki (-ing): <b>${this.ingYap(k.w)}</b>`;
    }
};

/* ==================================================
   MODÜL BAĞLAYICI — sözlük↔kartlar↔yazma↔okuma↔quiz↔tekrar
   Aynı kelime/seviye üzerinden modüller arası geçiş
   ================================================== */
const ModulBaglanti = {
    // Kelimeyi akıllı tekrara hemen ekle (bugünkü tekrara çıksın)
    planaEkle(k) {
        if (typeof AkilliTekrar === 'undefined') return;
        const r = AkilliTekrar.kayitOlustur(k);
        r.i = 1;
        r.n = Date.now();
        AkilliTekrar.kaydet();
        if (typeof SrsUygulamasi !== 'undefined') SrsUygulamasi.rozetGuncelle();
    },

    // Sözlükte kelimeyi aç (arama + detay) ve git
    sozlukteAc(k) {
        if (typeof SozlukUygulamasi === 'undefined' || !k) return;
        SozlukUygulamasi.aramaYap(k.w);
        SozlukUygulamasi.detayiGoster(k);
        const p = document.getElementById('sozluk');
        if (p) p.scrollIntoView({ behavior: 'smooth' });
    },

    // Modüle geç: seviye çipini tıklat (modülün kendi filtresi çalışır) + kaydır
    gec(modul, lv) {
        const secim = { kartlar: 'seviye-filtre', yazma: 'yazma-seviye-filtre', okuma: 'okuma-seviye-filtre' }[modul];
        if (secim) {
            const chip = document.querySelector(`#${secim} .chip[data-value="${lv}"]`);
            if (chip) chip.click();
        }
        const bolum = { kartlar: 'kartlar', yazma: 'yazma', okuma: 'okuma' }[modul];
        const p = document.getElementById(bolum);
        if (p) p.scrollIntoView({ behavior: 'smooth' });
    },

    // Sözlük detayı için buton sırası
    sozlukBaglanti(k) {
        return `<span class="bagli-etiket">🧩 Bu kelimeyle:</span>
            <div class="bagli-butonlar">
                <button class="btn bgl" data-eylem="kart">🎴 Kartlar</button>
                <button class="btn bgl" data-eylem="yazma">✍️ Yazma</button>
                <button class="btn bgl" data-eylem="okuma">📖 Okuma</button>
                <button class="btn bgl" data-eylem="quiz">📝 Quiz'de test</button>
                <button class="btn bgl bgl-ekle" data-eylem="tekrar">➕ Tekrara ekle</button>
            </div>`;
    },

    baglaAlani(el, k) {
        el.querySelectorAll('.bgl').forEach((b) => {
            b.addEventListener('click', () => {
                const e = b.dataset.eylem;
                if (e === 'kart') this.gec('kartlar', k.lv);
                else if (e === 'yazma') this.gec('yazma', k.lv);
                else if (e === 'okuma') this.gec('okuma', k.lv);
                else if (e === 'quiz') {
                    if (typeof QuizUygulamasi !== 'undefined') QuizUygulamasi.tekKelimeIle(k);
                }
                else if (e === 'tekrar') { this.planaEkle(k); b.textContent = '✅ Eklendi'; b.disabled = true; }
            });
        });
    },

    // Kelime popup'ı (okuma) — dışa tıklayınca kapanır
    kurPopKapatma() {
        if (this._kapatildi) return;
        this._kapatildi = true;
        document.addEventListener('click', (ev) => {
            const pop = document.getElementById('okuma-pop');
            if (pop && !pop.classList.contains('hidden') && !ev.target.closest('#okuma-pop')) {
                pop.classList.add('hidden');
            }
        });
        document.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape') {
                const pop = document.getElementById('okuma-pop');
                if (pop) pop.classList.add('hidden');
            }
        });
    }
};

/* ==================================================
   SİTE KORUMA — teknik sağlamlık + mobil katkıları
   - Çevrimdışı uyarısı, hata yönetimi (toast)
   - İlerleme yedeği (indir / geri yükle)
   - Başa dön + mobil hızlı menü
   ================================================== */
const SiteKoruma = {
    baslat() {
        this.offlineDinle();
        this.hataDinle();
        this.baglaUI();
    },

    offlineDinle() {
        const b = document.getElementById('offline-banner');
        const g = () => {
            if (b) b.textContent = navigator.onLine
                ? '' : '📡 İnternet yok — site çalışır ama ses/çeviri hizmetleri beklemez.';
            if (b) b.classList.toggle('acik', !navigator.onLine);
        };
        window.addEventListener('online', g);
        window.addEventListener('offline', g);
        g();
    },

    hataDinle() {
        window.addEventListener('error', (e) => {
            this.toast('⚠️ Bir şeyler ters gitti — sayfayı yenilemeyi veya ilerlemeni yedeklemeyi dene.');
            try { console.error('[EngLearn]', e.message || String(e)); } catch (x) {}
        });
        window.addEventListener('unhandledrejection', (e) => {
            try { console.error('[EngLearn] istek başarısız:', String(e.reason || '').slice(0, 120)); } catch (x) {}
        });
    },

    toast(mesaj) {
        let t = document.getElementById('site-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'site-toast';
            t.className = 'site-toast';
            t.setAttribute('role', 'status');
            t.setAttribute('aria-live', 'polite');
            document.body.appendChild(t);
        }
        t.textContent = mesaj;
        t.classList.add('gorunur');
        clearTimeout(this._t);
        this._t = setTimeout(() => t.classList.remove('gorunur'), 4200);
    },

    yedekIndir() {
        try {
            const veri = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('englearn')) veri[k] = localStorage.getItem(k);
            }
            const blob = new Blob([JSON.stringify({
                uygulama: 'EngLearn', surum: 1, tarih: new Date().toISOString(), veri
            }, null, 1)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'englearn-yedek.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            this.toast('💾 Yedek indirildi');
        } catch (e) { this.toast('⚠️ Yedek alınamadı: ' + (e.message || e)); }
    },

    yedekYukle(file) {
        if (!file) return;
        const oku = new FileReader();
        oku.onload = () => {
            try {
                const parse = JSON.parse(oku.result || '{}');
                const kaynak = (parse && parse.veri) ? parse.veri : parse;
                if (!kaynak || typeof kaynak !== 'object') throw new Error('geçersiz');
                let sayi = 0;
                for (const k of Object.keys(kaynak)) {
                    if (k.startsWith('englearn')) {
                        try { localStorage.setItem(k, kaynak[k]); sayi++; } catch (e) {}
                    }
                }
                this.toast(`📥 ${sayi} kayıt geri yüklendi — sayfa yenileniyor…`);
                setTimeout(() => location.reload(), 1300);
            } catch (e) { this.toast('⚠️ Yedek dosyası okunamadı (geçersiz format).'); }
        };
        oku.readAsText(file);
    },

    basinaDon() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    baglaUI() {
        const indir = document.getElementById('btn-yedek-indir');
        if (indir) indir.addEventListener('click', () => this.yedekIndir());
        const yukle = document.getElementById('btn-yedek-yukle');
        const inpt = document.getElementById('yedek-dosya');
        if (yukle && inpt) {
            yukle.addEventListener('click', () => inpt.click());
            inpt.addEventListener('change', () => { this.yedekYukle(inpt.files && inpt.files[0]); inpt.value = ''; });
        }
    }
};

/* ==================================================
   AÇIKLAMALI HATA SİSTEMİ — öğretici geri bildirim
   ================================================== */
const AciklamaliGeri = {
    // Şık seçmeli yanlış: doğru + örnek + bağlam
    kelime(k) {
        if (!k) return '';
        let h = `<b>${k.w || ''}</b> = ${k.tr || ''}`;
        if (k.lv || k.ct) h += ` <span class="tip">[${k.lv || ''}${k.ct ? ' · ' + k.ct : ''}]</span>`;
        if (k.ex) h += `<br><span class="feedback-ornek">📎 ${k.ex}</span>`;
        if (k.exTr) h += ` <span class="tip">(${k.exTr})</span>`;
        return h;
    },

    // Cümle için: doğru cümledeki yaygın kalıplardan ders çıkar
    gramerIpuclari(en) {
        const ipuc = [];
        const d = (en || '').toLowerCase();
        const ekle = (re, tip) => { if (re.test(d)) ipuc.push(tip); };
        ekle(/\bwant to \w+/, "want + <b>to</b> + fiil: want'tan sonra eylem gelirken araya «to» girer (want to learn).");
        ekle(/\bwould like to \w+/, "«would like» kalıbından sonra <b>to</b> + fiil gelir.");
        ekle(/\bneed to \w+/, "«need to» + fiil kalıbı kullanılır (need to go).");
        ekle(/\bdecide to \w+/, "«decide» fiilinden sonra «to» + fiil gelir.");
        ekle(/\bplan to \w+/, "«plan to» + fiil kalıbı kullanılır.");
        ekle(/\btry to \w+/, "«try to» + fiil kalıbı kullanılır.");
        ekle(/\bstart to \w+/, "«start» + «to» + fiil kullanılır.");
        ekle(/\bhope to \w+/, "«hope to» + fiil kalıbı kullanılır.");
        ekle(/\blearn to \w+/, "«learn» + «to» + fiil kullanılır.");
        ekle(/\bstop \w+ing\b/, "«stop» + fiil + -ing kalıbı kullanılır (stop talking).");
        ekle(/\benjoy \w+ing\b/, "«enjoy» + fiil + -ing kalıbı kullanılır (enjoy reading).");
        ekle(/\blike \w+ing\b|\blike to \w+/, "«like»: fiil + -ing ya da like + to + fiil kullanılır.");
        ekle(/\bgo to (the )?\w+/, "Varılan yerden önce «to» edatı gelir: go <b>to</b> school.");
        ekle(/\bin the (morning|evening|afternoon|past|future)\b/, "Zaman ifadesi «in» edatıyla kurulur: <b>in</b> the morning.");
        ekle(/\bat (night|the weekend|home|school|work)\b/, "«at» edatı: <b>at</b> night / at the weekend / at home.");
        ekle(/\bon (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/, "Gün adlarından önce «on» kullanılır: <b>on</b> Monday.");
        ekle(/\ba few \w+/, "«a few» + çoğul isim (az sayıda) — sayılabilen isimlerle.");
        ekle(/\ba little \w+/, "«a little» + isim (az miktar) — sayılamayan isimlerle.");
        ekle(/\bthere (is|are)\b/, "Varlık bildirme: «there is» (tekil) / «there are» (çoğul).");
        ekle(/\bmore \w+? than\b/, "Karşılaştırma: more + sıfat + <b>than</b>.");
        ekle(/\bthe \w+est\b/, "Üstünlük: <b>the</b> + sıfat + -est (the biggest).");
        ekle(/\b(is|are|was|were|am) \w+ing\b/, "Şimdiki zaman: am/is/are + fiil + -ing kalıbı (is working).");
        ekle(/\b(did|does) \w+ (have|go|play)/, "Did/Does ile soru/olumsuzda ana fiil yalın kalır (did he have).");
        ekle(/\b(can|should|will|must|may|might) \w+/, "Kip (can/should/will...) + fiilin yalın hâli gelir (you must study).");
        return ipuc;
    },

    // Cümle: kullanıcının sıralamasındaki yanlış konumlu kelimeler
    siralama(kullanici, dogru) {
        const ipuc = [];
        const d = dogru.slice();
        const k = kullanici.slice();
        d.forEach((kel, i) => {
            if (k[i] === kel) return;
            const j = k.indexOf(kel);
            if (j !== -1 && j !== i) {
                ipuc.push(`«${kel}» ${i + 1}. sırada olmalı (sen ${j + 1}. sıraya koydun).`);
                k.splice(j, 1);
                k.splice(i, 0, kel);
            }
        });
        return ipuc;
    },

    // Seçmeli sonuç özeti: yanlışlar + güçlü konular + öneri
    ozet(dogruSayi, yanlisSayi, yanlisListe, konular) {
        const toplam = dogruSayi + yanlisSayi;
        const yuzde = toplam ? Math.round((dogruSayi / toplam) * 100) : 0;
        let h = `<h3>✅ Tamamlandı!</h3>
            <p>Sonuç: <b>${dogruSayi}</b> doğru, <b>${yanlisSayi}</b> yanlış (${yuzde}%).</p>`;
        if (yanlisListe && yanlisListe.length) {
            h += `<div class="geri-baslik">😅 Yanlış yaptıkların (${yanlisListe.length})</div><ul class="geri-list">`;
            yanlisListe.forEach((k) => { h += `<li>${this.kelime(k)}</li>`; });
            h += `</ul>`;
        } else {
            h += `<p>🎉 Hiç yanlış yok — harika!</p>`;
        }
        const sirali = (konular ? Object.entries(konular) : []).sort((a, b) => b[1] - a[1]).slice(0, 3);
        if (sirali.length) {
            h += `<div class="geri-baslik">💪 Güçlü tarafların</div><p>${sirali.map(([k, v]) => `${k} (${v})`).join(' · ')}</p>`;
        }
        h += `<div class="geri-baslik">👉 Sıradaki adım</div>
            <p>Yanlışların Akıllı Tekrar planına eklendi — onları orada bitirebilirsin:</p>
            <div class="yanlis-butonlar"><button class="btn btn-next" id="btn-ozet-tekrar">🧠 Akıllı Tekrar'a git</button></div>`;
        return h;
    }
};

/* ==================================================
   2) CÜMLE OLUŞTURMA
   ================================================== */
const CumleUygulamasi = {
    sira: 0,
    kelimeListesi: [], // karışık kelimeler
    cevap: [],         // kullanıcının dizdiği sıra
    dogru: 0,
    yanlis: 0,
    seciliZorluk: 'all', // all | 1 | 2 | 3
    cumleHavuzu: [],     // filtreye uygun cümle listesi
    orijinalCumleler: [], // tüm cümleler (karıştırılmadan önce)

    baslat() {
        // Orijinal listeyi sakla (filtre değişince yeniden kurmak için)
        this.orijinalCumleler = [...CUMLER];
        this.cumleHavuzuKur();
        this.zorlukFiltreleriBagla();
        this.yukle();
        this.olaylariBagla();
    },

    // Mevcut zorluk filtresine göre cümle listesini kur + karıştır
    cumleHavuzuKur() {
        this.cumleHavuzu = this.seciliZorluk === 'all'
            ? [...this.orijinalCumleler]
            : this.orijinalCumleler.filter((c) => c.zorluk === Number(this.seciliZorluk));
        // Fisher-Yates karıştırma
        for (let i = this.cumleHavuzu.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cumleHavuzu[i], this.cumleHavuzu[j]] = [this.cumleHavuzu[j], this.cumleHavuzu[i]];
        }
        this.sira = 0;
    },

    // Zorluk filtre tuşlarını bağla
    zorlukFiltreleriBagla() {
        const chipler = document.querySelectorAll('#diff-filtre .diff-chip');
        chipler.forEach((chip) => {
            chip.addEventListener('click', () => {
                chipler.forEach((c) => c.classList.remove('active'));
                chip.classList.add('active');
                this.seciliZorluk = chip.dataset.difficulty;
                this.cumleHavuzuKur(); // yeni filtreye göre havuzu yeniden kur
                this.yukle();
            });
        });
    },

    yukle() {
        if (this.cumleHavuzu.length === 0) return;
        const c = this.cumleHavuzu[this.sira];
        document.getElementById('cumle-turkce').textContent = c.tr;
        document.getElementById('cumle-ipucu').textContent = `${c.en.split(' ').length} kelime`;

        this.cevap = [];
        this.kelimeListesi = c.en.split(' ').filter((k) => k !== '');
        this.karistir();
        this.ciz();
        this.gizleGeriBildirim();
    },

    karistir() {
        for (let i = this.kelimeListesi.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.kelimeListesi[i], this.kelimeListesi[j]] =
                [this.kelimeListesi[j], this.kelimeListesi[i]];
        }
    },

    ciz() {
        // Kelime havuzu
        const havuz = document.getElementById('kelime-havuzu');
        havuz.innerHTML = '';
        this.kelimeListesi.forEach((k, i) => {
            const span = document.createElement('span');
            span.className = 'pool-word';
            span.dataset.indeks = i;
            span.textContent = k;
            span.addEventListener('click', () => {
                ses.konus(k); // kelimeyi seslendir
                this.havuzaDokun(i);
            });
            havuz.appendChild(span);
        });

        // Cevap alanı
        const alan = document.getElementById('cevap-alani');
        alan.innerHTML = '<span class="placeholder">👉 Kelimelere tıklayarak cümleyi buraya kur</span>';
    },

    havuzaDokun(indeks) {
        const kelime = this.kelimeListesi[indeks];
        const alan = document.getElementById('cevap-alani');

        // Kelimeyi havuzdan al (orijinal indeksini hatırla)
        this.kelimeListesi[indeks] = null;

        // Cevaba ekle (orijinal indeks bilgisiyle)
        this.cevap.push({ kelime: kelime, indeks: indeks });
        const span = document.createElement('span');
        span.className = 'answer-word';
        span.textContent = kelime;
        span.dataset.indeks = indeks;
        span.addEventListener('click', () => this.cevaptanKaldir(span));
        alan.appendChild(span);
        alan.querySelector('.placeholder')?.remove();
        // Havuzdan kaldır
        document.querySelector(`.pool-word[data-indeks="${indeks}"]`)?.classList.add('used');
    },

    cevaptanKaldir(span) {
        // Kelimenin orijinal indeksini span'dan al
        const indeks = parseInt(span.dataset.indeks);
        const kelime = span.textContent;

        // Kelimeyi seslendir (geri alırken de duysun)
        ses.konus(kelime);

        // Kelimeyi havuzda TAM ORİJİNAL konumuna geri koy
        this.kelimeListesi[indeks] = kelime;

        // Cevap dizisinden sadece bu öğeyi çıkar
        const cevapSirasi = this.cevap.findIndex((o) => o.indeks === indeks);
        if (cevapSirasi !== -1) {
            this.cevap.splice(cevapSirasi, 1);
        }

        span.remove();

        // Havuzdaki kullanılmış durumunu kaldır
        document.querySelector(`.pool-word[data-indeks="${indeks}"]`)?.classList.remove('used');

        if (this.cevap.length === 0) {
            const alan = document.getElementById('cevap-alani');
            alan.innerHTML = '<span class="placeholder">👉 Kelimelere tıklayarak cümleyi buraya kur</span>';
        }
    },

    kontrol() {
        const c = this.cumleHavuzu[this.sira];
        const dogruCevap = c.en.split(' ').filter((k) => k !== '');
        const kullaniciCevap = this.cevap.map((o) => o.kelime);

        const geriBildirim = document.getElementById('geri-bildirim');
        geriBildirim.classList.remove('hidden');

        const ayniMi =
            kullaniciCevap.length === dogruCevap.length &&
            kullaniciCevap.every((k, i) => k === dogruCevap[i]);

        if (ayniMi) {
            this.dogru++;
            geriBildirim.className = 'feedback dogru';
            const ipuclar = AciklamaliGeri.gramerIpuclari(c.en);
            let html = `🎉 Doğru! <b>"${c.en}"</b>`;
            if (ipuclar.length) {
                html += `<div class="geri-baslik">📘 Bu kalıp</div><ul class="geri-list"><li>${ipuclar[0]}</li></ul>`;
            }
            geriBildirim.innerHTML = html;
        } else {
            this.yanlis++;
            geriBildirim.className = 'feedback yanlis';
            const siralama = AciklamaliGeri.siralama(kullaniciCevap, dogruCevap);
            const ipuclar = AciklamaliGeri.gramerIpuclari(c.en);
            let html = `😅 Yanlış. Doğru cevap: <span class="dogru-cevap">"${c.en}"</span>`;
            if (siralama.length) {
                html += `<div class="geri-baslik">📍 Sıralama</div><ul class="geri-list">` +
                    siralama.map((x) => `<li>${x}</li>`).join('') + `</ul>`;
            }
            if (ipuclar.length) {
                html += `<div class="geri-baslik">📘 Dilbilgisi</div><ul class="geri-list">` +
                    ipuclar.map((x) => `<li>${x}</li>`).join('') + `</ul>`;
            }
            geriBildirim.innerHTML = html;
            // Yanlışı kaydet → "Yanlışlarım"da tekrar çalış
            YanlisKaydedici.kaydet({
                id: 'cumle|' + c.tr,
                tip: 'cumle',
                kelime: c.tr,
                verdi: kullaniciCevap.join(' '),
                dogru: c.en
            });
        }

        document.getElementById('skor').textContent = this.dogru + this.yanlis;
        document.getElementById('dogru-sayi').textContent = this.dogru;
        document.getElementById('yanlis-sayi').textContent = this.yanlis;
    },

    gizleGeriBildirim() {
        document.getElementById('geri-bildirim').classList.add('hidden');
    },

    sonraki() {
        if (this.sira < this.cumleHavuzu.length - 1) {
            this.sira++;
            this.yukle();
        } else {
            this.sira = 0; // baştan başla
            this.yukle();
            SiteKoruma.toast('🎯 Tüm cümleleri tamamladınız! Tekrar başlıyorsunuz. İyi pratikler!');
        }
    },

    olaylariBagla() {
        document.getElementById('btn-temizle').addEventListener('click', () => this.temizle());
        document.getElementById('btn-kontrol').addEventListener('click', () => this.kontrol());
        document.getElementById('btn-sonraki-cumle').addEventListener('click', () => this.sonraki());
        document.getElementById('btn-ses-cumle-tamami').addEventListener('click', () => {
            const c = this.cumleHavuzu[this.sira];
            ses.konus(c.en);
        });
    },

    temizle() {
        // Mevcut cümleyi temel al: cevaptaki kelimeler dahil tümünü havuca geri koy
        const c = this.cumleHavuzu[this.sira];
        this.cevap = [];
        this.kelimeListesi = c.en.split(' ').filter((k) => k !== '');
        this.karistir();
        this.ciz();
        this.gizleGeriBildirim();
    }
};

/* ==================================================
   3) QUIZ / TEST MODU
   ================================================== */
const QuizUygulamasi = {
    sorular: [],
    suankiSoru: 0,
    dogru: 0,
    yanlis: 0,
    cevapSecildi: false,
    toplamSoru: 10,

    baslat() {
        this.sorulariKarisikUret();
        this.olaylariBagla();
        this.soruGoster();
    },

    sorulariKarisikUret() {
        // Rastgele 10 farklı kelime seç
        const karisik = [...KELIMELER].sort(() => Math.random() - 0.5);
        this.sorular = karisik.slice(0, this.toplamSoru);
        // Her soru için çeldiricileri önceden hazırla
        this.sorular = this.sorular.map((kelime) => {
            const yanlislar = KELIMELER.filter((k) => k.w !== kelime.w);
            const celdiriciler = yanlislar
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map((k) => k.tr);
            const secenekler = [...celdiriciler, kelime.tr].sort(() => Math.random() - 0.5);
            return { kelime, secenekler };
        });
        this.suankiSoru = 0;
        this.dogru = 0;
        this.yanlis = 0;
        this.cevapSecildi = false;
        this.yanlisListe = [];
        this.konuDogru = {};
    },

    soruGoster() {
        const s = this.sorular[this.suankiSoru];
        if (!s) return;

        document.getElementById('quiz-ilerleme').textContent =
            `Soru ${this.suankiSoru + 1} / ${this.toplamSoru}`;
        document.getElementById('quiz-kelime').textContent = s.kelime.w;
        document.getElementById('quiz-telaffuz').textContent = s.kelime.pr || '';
        document.getElementById('quiz-seviye').textContent = s.kelime.lv;
        document.getElementById('quiz-dogru').textContent = this.dogru;
        document.getElementById('quiz-yanlis').textContent = this.yanlis;

        // Seçenekler
        const kutu = document.getElementById('quiz-secenekler');
        kutu.innerHTML = '';
        s.secenekler.forEach((cevap) => {
            const buton = document.createElement('button');
            buton.className = 'quiz-option';
            buton.textContent = cevap;
            buton.addEventListener('click', () => this.secenekTikla(buton, cevap));
            kutu.appendChild(buton);
        });

        this.cevapSecildi = false;
        const geri = document.getElementById('quiz-geri');
        geri.classList.add('hidden');
        document.getElementById('btn-quiz-sonraki').disabled = true;
    },

    secenekTikla(buton, secilen) {
        if (this.cevapSecildi) return;
        this.cevapSecildi = true;

        const s = this.sorular[this.suankiSoru];
        const geri = document.getElementById('quiz-geri');
        const tumSecenekler = document.querySelectorAll('#quiz-secenekler .quiz-option');

        if (secilen === s.kelime.tr) {
            this.dogru++;
            this.konuDogru[s.kelime.ct || s.kelime.lv] = (this.konuDogru[s.kelime.ct || s.kelime.lv] || 0) + 1;
            // Doğru → akıllı tekrarda aralığı uzat
            if (typeof AkilliTekrar !== 'undefined') {
                AkilliTekrar.cevapla({ w: s.kelime.w, tr: s.kelime.tr, lv: s.kelime.lv, ct: s.kelime.ct, pr: s.kelime.pr }, 4);
                if (typeof SrsUygulamasi !== 'undefined') SrsUygulamasi.rozetGuncelle();
            }
            buton.classList.add('dogru-secim');
            geri.className = 'quiz-feedback dogru';
            geri.textContent = `🎉 Doğru! "${s.kelime.w}" = ${s.kelime.tr}`;
        } else {
            this.yanlis++;
            buton.classList.add('yanlis-secim');
            // Doğru seçeneği yeşil göster
            tumSecenekler.forEach((opt) => {
                if (opt.textContent === s.kelime.tr) opt.classList.add('dogru-secim');
            });
            geri.className = 'quiz-feedback yanlis';
            this.yanlisListe.push(s.kelime);
            geri.innerHTML = `😅 Yanlış! İşte açıklaması:<br>${AciklamaliGeri.kelime(s.kelime)}
                <div class="bagli-butonlar"><button class="btn bgl bgl-ekle" id="quizcok-sozluk">🔍 Sözlükte ara</button></div>`;
            const qsb = document.getElementById('quizcok-sozluk');
            if (qsb) qsb.addEventListener('click', () => ModulBaglanti.sozlukteAc(s.kelime));
            YanlisKaydedici.kaydet({
                id: 'quiz|' + s.kelime.w,
                tip: 'quiz',
                kelime: s.kelime.w,
                verdi: secilen,
                dogru: s.kelime.tr
            });
        }

        document.getElementById('quiz-dogru').textContent = this.dogru;
        document.getElementById('quiz-yanlis').textContent = this.yanlis;
        document.getElementById('btn-quiz-sonraki').disabled = false;
    },

    sonrakiSoru() {
        if (this.suankiSoru < this.sorular.length - 1) {
            this.suankiSoru++;
            this.soruGoster();
        } else {
            // Quiz bitti — açıklamalı özet (yanlışlar, güçlü konular, öneri)
            const geriOzet = document.getElementById('quiz-geri');
            if (geriOzet) {
                geriOzet.classList.remove('hidden');
                geriOzet.className = 'quiz-feedback dogru';
                geriOzet.innerHTML = AciklamaliGeri.ozet(this.dogru, this.yanlis, this.yanlisListe || [], this.konuDogru || {});
                const git = document.getElementById('btn-ozet-tekrar');
                if (git) git.addEventListener('click', () => {
                    const p = document.getElementById('tekrar');
                    if (p) p.scrollIntoView({ behavior: 'smooth' });
                });
            }
            document.getElementById('quiz-ilerleme').textContent = 'Bitti 🎓';
        }
    },

    // Başka bir modülden gelen kelimeyle mini test başlat
    tekKelimeIle(hedef) {
        if (typeof KELIMELER === 'undefined') return;
        const secim = [hedef];
        const diger = KELIMELER
            .filter((kk) => kk.w !== hedef.w)
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);
        secim.push(...diger);
        this.sorular = secim.map((kelime) => {
            const yanlislar = KELIMELER
                .filter((k) => k.w !== kelime.w)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map((k) => k.tr);
            const secenekler = [...yanlislar, kelime.tr].sort(() => Math.random() - 0.5);
            return { kelime, secenekler };
        });
        this.toplamSoru = this.sorular.length;
        this.suankiSoru = 0;
        this.dogru = 0;
        this.yanlis = 0;
        this.cevapSecildi = false;
        this.yanlisListe = [];
        this.konuDogru = {};
        this.soruGoster();
        const p = document.getElementById('quiz');
        if (p) p.scrollIntoView({ behavior: 'smooth' });
    },

    olaylariBagla() {
        document.getElementById('btn-quiz-sonraki').addEventListener('click', () => this.sonrakiSoru());        document.getElementById('btn-quiz-yeniden').addEventListener('click', () => {
            this.sorulariKarisikUret();
            this.soruGoster();
        });
        document.getElementById('btn-quiz-ses').addEventListener('click', () => {
            const s = this.sorular[this.suankiSoru];
            if (s) ses.konus(s.kelime.w);
        });
    }
};

/* ==================================================
   4) KELİME YAZMA (Türkçe → İngilizce yaz — harf kutuları)
   ================================================== */
const YazmaUygulamasi = {
    liste: [],         // filtreye uygun kelimeler
    indeks: 0,         // sıradaki kelime
    seciliSeviye: 'all',
    dogru: 0,
    yanlis: 0,
    cevapli: false,    // bu kelime cevaplandı mı
    gecerliCevap: '',  // doğru kelime (küçük harf)
    ipucuKonumlari: new Set(), // ipucu ile açılan harf konumları (indeksler)
    ipucuHakki: 3,     // her kelime için 3 ipucu hakkı

    baslat() {
        this.liste = this.karistir([...KELIMELER]);
        this.filtreleriBagla();
        this.soruGoster();
        this.olaylariBagla();
    },

    // Fisher-Yates karıştırma — her yeniden başlatmada farklı sıra
    karistir(dizi) {
        for (let i = dizi.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dizi[i], dizi[j]] = [dizi[j], dizi[i]];
        }
        return dizi;
    },

    // Seviye çipleri
    filtreleriBagla() {
        const cipleri = document.querySelectorAll('#yazma-seviye-filtre .chip');
        cipleri.forEach((chip) => {
            chip.addEventListener('click', () => {
                cipleri.forEach((c) => c.classList.remove('active'));
                chip.classList.add('active');
                this.seciliSeviye = chip.dataset.value;
                // Filtre değişiminde de listeyi karıştır → farklı kelimeyle başla
                this.liste = this.karistir(this.seciliSevyeyeUy());
                this.indeks = 0;
                this.soruGoster();
            });
        });
    },

    seciliSevyeyeUy() {
        return this.seciliSeviye === 'all'
            ? [...KELIMELER]
            : KELIMELER.filter((k) => k.lv === this.seciliSeviye);
    },

    soruGoster() {
        if (this.liste.length === 0) return;
        const k = this.liste[this.indeks];
        document.getElementById('yazma-anlam').textContent = k.tr.toLowerCase();
        document.getElementById('yazma-ipucu').textContent = k.lv;

        // Doğru cevabı sakla (küçük harfe çevir)
        this.gecerliCevap = k.w.toLowerCase().trim();

        // Yeni kelime → ipucu hakları sıfırlanır
        this.ipucuKonumlari = new Set();
        this.ipucuHakki = 3;
        this.ipucuGosterGuncelle();

        // Harf kutuları oluştur
        this.kutuCiz(this.gecerliCevap);

        // Girdiyi temizle ve odakla (sayfa en üste kaymasın)
        const girdi = document.getElementById('yazma-girdi');
        girdi.value = '';
        girdi.classList.remove('dogru-sinir', 'yanlis-sinir');
        this.kutulariYenile('');
        this.girdiyeOdak();

        this.gizleGeri();
        this.cevapli = false;
        this.skorGuncelle();
    },

    // İpucu butonundaki kalan hak sayısını güncelle
    ipucuGosterGuncelle() {
        const btn = document.getElementById('btn-yazma-ipucu');
        if (btn) btn.textContent = `🔤 Harf Al (${this.ipucuHakki})`;
    },

    // Güvenli odaklama: sayfa asla en üste kaymaz
    girdiyeOdak() {
        const girdi = document.getElementById('yazma-girdi');
        if (!girdi) return;
        const oncekiX = window.scrollX;
        const oncekiY = window.scrollY;
        try {
            girdi.focus({ preventScroll: true });
        } catch (e) {
            girdi.focus();
        }
        // Bazı tarayıcılar yine de kaydırırsa geri al
        setTimeout(() => {
            if (window.scrollX !== oncekiX || window.scrollY !== oncekiY) {
                window.scrollTo(oncekiX, oncekiY);
            }
        }, 0);
    },

    // Rastgele boş bir harfi göster
    ipucuVer() {
        if (this.cevapli || this.ipucuHakki <= 0) return;
        const cevap = this.gecerliCevap;
        if (!cevap) return;

        // Henüz açılmamış / doldurulmamış konumları bul
        const girdi = document.getElementById('yazma-girdi').value.toLowerCase();
        const boslar = [];
        for (let i = 0; i < cevap.length; i++) {
            const dolu = this.ipucuKonumlari.has(i) || (i < girdi.length && girdi[i] === cevap[i]);
            if (!dolu) boslar.push(i);
        }
        if (boslar.length === 0) return;

        // Rastgele bir boş konum seç → doğru harfi kutuya yaz
        const secilen = boslar[Math.floor(Math.random() * boslar.length)];
        this.ipucuKonumlari.add(secilen);
        this.ipucuHakki--;
        this.ipucuGosterGuncelle();

        // Kutuyu doğru harfle doldur + vurgula
        const kutu = document.querySelector(`#yazma-slots .letter-slot[data-indeks="${secilen}"]`);
        if (kutu) {
            kutu.textContent = cevap[secilen];
            kutu.classList.add('ipucu-verildi');
        }
        if (this.ipucuHakki <= 0) SiteKoruma.toast('💡 Artık ipucu hakkınız kalmadı, kalanını kendiniz bulun!');
    },

    // Kelimenin her harfi için bir kutu (kutular '_' gösterir)
    kutuCiz(cevap) {
        const kutu = document.getElementById('yazma-slots');
        kutu.innerHTML = '';

        // Kelime uzunluğuna göre kutu boyutunu ayarla → tek satıra sığar
        const satirGenislik = 520; // yazma kutusunun yaklaşık iç genişliği (px)
        const aralik = 6;          // kutular arası boşluk (px)
        const uzunluk = cevap.length;
        const kutuBoyutu = Math.min(40, Math.floor((satirGenislik - (uzunluk - 1) * aralik) / uzunluk));
        const minBoyut = 26; // asla çok küçük olmasın (aşırı uzun kelimede)

        for (let i = 0; i < cevap.length; i++) {
            const h = document.createElement('span');
            h.className = 'letter-slot';
            h.textContent = '_';
            h.dataset.indeks = i;
            h.style.width = Math.max(minBoyut, kutuBoyutu) + 'px';
            h.style.height = Math.max(minBoyut, kutuBoyutu) + 8 + 'px';
            h.style.fontSize = Math.max(12, kutuBoyutu - 8) + 'px';
            kutu.appendChild(h);
        }
    },

    // Kutulara yansıt: ipucuyla dolu konumlar korunur, kullanıcı harfleri BOŞ konumlara sıralanır
    kutulariYenile(deger) {
        const kutular = document.querySelectorAll('#yazma-slots .letter-slot');
        let kullaniciIndeks = 0;
        for (let i = 0; i < kutular.length; i++) {
            if (this.ipucuKonumlari.has(i)) {
                // İpucu ile dolu konum: doğru harf, dokunulmaz
                kutular[i].textContent = this.gecerliCevap[i] || '_';
                kutular[i].classList.add('dolu', 'ipucu-verildi');
            } else if (kullaniciIndeks < deger.length) {
                // Kullanıcı harfi: soldan sağa boş konumlara
                kutular[i].textContent = deger[kullaniciIndeks].toLowerCase();
                kutular[i].classList.add('dolu');
                kutular[i].classList.remove('ipucu-verildi');
                kullaniciIndeks++;
            } else {
                kutular[i].textContent = '_';
                kutular[i].classList.remove('dolu', 'ipucu-verildi');
            }
        }
    },

    // Gizli inputtan harf al, kutulara yansıt
    gizliInputDinle() {
        // Gizli input aktifken: yazılan harfleri al ve kutulara dök
        const girdi = document.getElementById('yazma-girdi');
        let deger = girdi.value.replace(/[^a-zA-Z\s'-]/g, '');
        // Yazılabilecek maksimum harf: toplam uzunluk - ipucuyla dolu konumlar
        const bosSayisi = this.gecerliCevap.length - this.ipucuKonumlari.size;
        deger = deger.slice(0, bosSayisi);
        this.kutulariYenile(deger);
    },

    // Birleşik cevap: ipucu harfleri + kullanıcı harfleri (boş konumlar dahil)
    bilesikCevap() {
        const cevap = this.gecerliCevap;
        const girdi = document.getElementById('yazma-girdi').value.replace(/[^a-zA-Z\s'-]/g, '').toLowerCase();
        const dizi = new Array(cevap.length).fill('');
        // İpucu konumlarını doldur
        for (const konum of this.ipucuKonumlari) {
            dizi[konum] = cevap[konum];
        }
        // Kullanıcı harflerini boş konumlara sırala
        let kullaniciIndeks = 0;
        for (let i = 0; i < dizi.length; i++) {
            if (dizi[i] === '' && kullaniciIndeks < girdi.length) {
                dizi[i] = girdi[kullaniciIndeks];
                kullaniciIndeks++;
            }
        }
        return dizi.join('');
    },

    kontrol() {
        if (this.cevapli) return;
        const geri = document.getElementById('yazma-geri');
        const girdi = document.getElementById('yazma-girdi');

        const girilen = this.bilesikCevap().trim().toLowerCase();
        const dogru = this.gecerliCevap;
        const benzerlik = this.benzerlikOrani(girilen, dogru);
        const ayniMi = girilen === dogru || benzerlik >= 0.8;

        geri.classList.remove('hidden');

        if (ayniMi) {
            this.dogru++;
            geri.className = 'feedback dogru';
            geri.innerHTML = `🎉 Doğru! <b>"${this.liste[this.indeks].w}"</b>`;
            this.kutulariRenklendir('dogru');
        } else {
            this.yanlis++;
            geri.className = 'feedback yanlis';
            geri.innerHTML =
                `😅 Yanlış! Doğrusu: <b>"${this.liste[this.indeks].w}"</b> — ${this.liste[this.indeks].tr}`;
            this.kutulariRenklendir('yanlis');
            // Yanlışı kaydet
            YanlisKaydedici.kaydet({
                id: 'yazma|' + this.liste[this.indeks].w,
                tip: 'yazma',
                kelime: this.liste[this.indeks].w,
                verdi: girilen,
                dogru: this.liste[this.indeks].tr
            });
        }
        // Modül bağlantıları
        const kw = this.liste[this.indeks];
        const bagEl = document.createElement('div');
        bagEl.className = 'bagli-butonlar';
        bagEl.innerHTML = `<button class="btn bgl" data-eylem="ysozluk">🔍 Sözlük</button>
                           <button class="btn bgl bgl-ekle" data-eylem="ytekrar">➕ Tekrara ekle</button>`;
        bagEl.querySelector('[data-eylem="ysozluk"]').addEventListener('click', () => ModulBaglanti.sozlukteAc(kw));
        bagEl.querySelector('[data-eylem="ytekrar"]').addEventListener('click', (e) => {
            ModulBaglanti.planaEkle(kw);
            e.target.textContent = '✅ Eklendi';
            e.target.disabled = true;
        });
        geri.appendChild(bagEl);
        this.cevapli = true;
        this.skorGuncelle();
    },

    // Kutuları doğru/yanlış rengine boya
    kutulariRenklendir(durum) {
        const kutular = document.querySelectorAll('#yazma-slots .letter-slot');
        const cevap = this.gecerliCevap;
        for (let i = 0; i < kutular.length; i++) {
            const harf = kutular[i].textContent.toLowerCase();
            if (harf === '_') {
                kutular[i].classList.add('bos');
            } else if (i < cevap.length && harf === cevap[i]) {
                kutular[i].classList.add('harf-dogru');
            } else {
                kutular[i].classList.add('harf-yanlis');
            }
        }
        // İpucu: doğru kelimeyi kutulara yaz (yanıt göster)
        for (let i = 0; i < kutular.length; i++) {
            kutular[i].textContent = cevap[i] !== undefined ? cevap[i].toLowerCase() : '_';
        }
    },

    // Basit benzerlik (Levenshtein tabanlı, küçük yazım hatalarını affine)
    benzerlikOrani(a, b) {
        if (!a || !b) return 0;
        if (a === b) return 1;
        const d = [];
        for (let i = 0; i <= a.length; i++) {
            d[i] = [i];
            for (let j = 0; j <= b.length; j++) {
                if (i === 0) { d[0][j] = j; }
                else if (j > 0) {
                    const maliyet = a[i - 1] === b[j - 1] ? 0 : 1;
                    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + maliyet);
                }
            }
        }
        const mesafe = d[a.length][b.length];
        return 1 - mesafe / Math.max(a.length, b.length);
    },

    sonraki() {
        if (this.indeks < this.liste.length - 1) {
            this.indeks++;
        } else {
            this.indeks = 0;
            SiteKoruma.toast('🎯 Tüm kelimeleri tamamladınız! Tekrar başlıyorsunuz. İyi pratikler!');
        }
        this.soruGoster();
    },

    seslendir() {
        const k = this.liste[this.indeks];
        if (k) ses.konus(k.w);
    },

    gizleGeri() {
        document.getElementById('yazma-geri').classList.add('hidden');
    },

    skorGuncelle() {
        document.getElementById('yazma-skor').textContent = this.dogru + this.yanlis;
        document.getElementById('yazma-dogru').textContent = this.dogru;
        document.getElementById('yazma-yanlis').textContent = this.yanlis;
    },

    olaylariBagla() {
        document.getElementById('btn-yazma-kontrol').addEventListener('click', () => this.kontrol());
        document.getElementById('btn-yazma-ses').addEventListener('click', () => this.seslendir());
        document.getElementById('btn-yazma-sonraki').addEventListener('click', () => this.sonraki());
        document.getElementById('btn-yazma-ipucu').addEventListener('click', () => this.ipucuVer());

        // Gizli input: klavye girişi için odak çekirdeği
        const girdi = document.getElementById('yazma-girdi');

        // Kutulara tıklama → gizli inputa odaklan (sayfa kaymasın)
        const slots = document.getElementById('yazma-slots');
        if (slots) {
            slots.addEventListener('mousedown', (e) => {
                e.preventDefault(); // kutulardaki metin seçimini engelle
                if (!this.cevapli) this.girdiyeOdak();
            });
            slots.addEventListener('touchstart', () => {
                if (!this.cevapli) this.girdiyeOdak();
            });
        }

        // Giriş/girişim olayları
        girdi.addEventListener('input', () => this.gizliInputDinle());
        girdi.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.cevapli) this.sonraki();
                else this.kontrol();
            }
        });

        // Sayfa boyunca klavye yakalama: gizli input odakta DEĞİLSE bile yazılan harfleri kabul et.
        // Böylece kullanıcı kutuya tıklamasa da doğrudan yazabilir.
        document.addEventListener('keydown', (e) => {
            if (this.cevapli) return;
            const yazmaAktif = document.getElementById('yazma').classList.contains('active-panel');
            if (!yazmaAktif) return;

            // Fonksiyon tuşları/kısayollar hariç, tek karakter yazınca inputa ekle
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                girdi.value = girdi.value + e.key;
                this.gizliInputDinle();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                girdi.value = girdi.value.slice(0, -1);
                this.gizliInputDinle();
            }
        });

        // Yalnızca yazma paneli aktifken inputa odaklan (sürekli klavye açılmasın)
        girdi.addEventListener('blur', () => {
            // panel geçişlerinde odak kaybedildiğinde sorun olmasın
        });
    }
};

/* ==================================================
   5) OKUMA (seviyeye göre metinler)
   ================================================== */
const OkumaUygulamasi = {
    seciliSeviye: 'all',
    suankiMetin: null,

    baslat() {
        this.filtreleriBagla();
        this.listeGoster();
        this.olaylariBagla();
    },

    // Seviye çipleri
    filtreleriBagla() {
        const cipleri = document.querySelectorAll('#okuma-seviye-filtre .chip');
        cipleri.forEach((chip) => {
            chip.addEventListener('click', () => {
                cipleri.forEach((c) => c.classList.remove('active'));
                chip.classList.add('active');
                this.seciliSeviye = chip.dataset.value;
                this.listeGoster();
            });
        });
    },

    // Filtreye uygun metinleri listeleme
    listeGoster() {
        const filtreli = this.seciliSeviye === 'all'
            ? [...METINLER]
            : METINLER.filter((m) => m.lv === this.seciliSeviye);

        const kutu = document.getElementById('okuma-liste');
        const detay = document.getElementById('okuma-detay');
        kutu.classList.remove('hidden');
        detay.classList.add('hidden');

        if (!filtreli.length) {
            kutu.innerHTML = '<p class="subtitle">Bu seviyede metin bulunamadı.</p>';
            return;
        }

        kutu.innerHTML = '';
        filtreli.forEach((m) => {
            const kart = document.createElement('div');
            kart.className = 'okuma-kart';
            kart.innerHTML = `
                <div class="okuma-kart-ust">
                    <span class="level-badge">${m.lv}</span>
                    <button class="sound-btn small okuma-kart-ses" title="Metni dinle">🔊</button>
                </div>
                <h3>${m.baslik}</h3>
                <p class="okuma-kart-ozet">${m.metin.slice(0, 90)}…</p>
                <button class="btn btn-next okuma-kart-oku">📖 Oku</button>
            `;
            // Oku butonu
            kart.querySelector('.okuma-kart-oku').addEventListener('click', () => this.detayGoster(m));
            // Ses butonu (karttan)
            kart.querySelector('.okuma-kart-ses').addEventListener('click', (e) => {
                e.stopPropagation();
                ses.konus(m.metin.slice(0, 180));
            });
            kutu.appendChild(kart);
        });
    },

    // Metin detay görünümü
    detayGoster(m) {
        this.suankiMetin = m;
        document.getElementById('okuma-liste').classList.add('hidden');
        const detay = document.getElementById('okuma-detay');
        detay.classList.remove('hidden');

        document.getElementById('okuma-metin-seviye').textContent = m.lv;
        document.getElementById('okuma-metin-baslik').textContent = m.baslik;

        // Metni cümle cümle böl (her cümle tıklanınca seslendirilir)
        const icerik = document.getElementById('okuma-metin-icerik');
        icerik.innerHTML = '';
        const cumleler = m.metin.match(/[^.!?]+[.!?]+/g) || [m.metin];
        cumleler.forEach((cumle) => {
            const p = document.createElement('p');
            p.className = 'okuma-cumle';
            const kelimeler = cumle.trim().split(/\s+/);
            kelimeler.forEach((kel, ix) => {
                const s = document.createElement('span');
                s.className = 'okuma-kelime';
                s.textContent = kel;
                s.title = 'Anlamı görmek için tıkla';
                s.dataset.kelime = kel.replace(/[.,!?;:'"()«»]/g, '');
                s.addEventListener('click', (ev) => this.kelimePop(ev, s.dataset.kelime));
                p.appendChild(s);
                if (ix < kelimeler.length - 1) p.appendChild(document.createTextNode(' '));
            });
            icerik.appendChild(p);
        });

        // Türkçe çeviriyi sakla
        const ceviri = document.getElementById('okuma-metin-ceviri');
        ceviri.innerHTML = m.ceviri;
        ceviri.classList.add('hidden');
    },

    // Tıklanan kelimenin popup kartı (anlam + sözlük + tekrar)
    kelimePop(ev, kel) {
        const pop = document.getElementById('okuma-pop');
        if (!pop || !kel) return;
        const bul = typeof KELIMELER !== 'undefined'
            ? KELIMELER.find((k) => k.w && k.w.toLowerCase() === kel.toLowerCase())
            : null;
        if (bul) {
            pop.innerHTML = `<b>${bul.w}</b> <span class="tip">[${bul.lv || ''}]</span> = ${bul.tr}
                ${bul.ex ? `<br><span class="feedback-ornek">📎 ${bul.ex}</span>` : ''}
                <div class="bagli-butonlar">
                    <button class="btn bgl" id="okumapop-sozluk">🔍 Sözlükte aç</button>
                    <button class="btn bgl bgl-ekle" id="okumapop-tekrar">➕ Tekrara ekle</button>
                </div>`;
            const sBtn = document.getElementById('okumapop-sozluk');
            if (sBtn) sBtn.addEventListener('click', () => {
                pop.classList.add('hidden');
                ModulBaglanti.sozlukteAc(bul);
            });
            const tBtn = document.getElementById('okumapop-tekrar');
            if (tBtn) tBtn.addEventListener('click', () => {
                ModulBaglanti.planaEkle(bul);
                tBtn.textContent = '✅ Eklendi';
                tBtn.disabled = true;
            });
        } else {
            pop.innerHTML = `<b>${kel}</b> <span class="tip">sözlükte bulunamadı (farklı yazım olabilir).</span>`;
        }
        pop.classList.remove('hidden');
        const gen = pop.offsetWidth, yuk = pop.offsetHeight;
        pop.style.left = Math.max(10, Math.min(ev.clientX, window.innerWidth - gen - 12)) + 'px';
        pop.style.top = Math.max(10, Math.min(ev.clientY, window.innerHeight - yuk - 12)) + 'px';
        ev.stopPropagation();
    },

    olaylariBagla() {
        // Listeye dön
        ModulBaglanti.kurPopKapatma();
        document.getElementById('btn-okuma-geri').addEventListener('click', () => {
            this.listeGoster();
            this.suankiMetin = null;
        });
        // Metni dinle (tamamını cümle cümle)
        document.getElementById('btn-okuma-dinle').addEventListener('click', () => {
            if (!this.suankiMetin) return;
            const cumleler = this.suankiMetin.metin.match(/[^.!?]+[.!?]+/g) || [this.suankiMetin.metin];
            // İlk cümleyi hemen, gerisini tek tek çal
            let i = 0;
            const oku = () => {
                if (i < cumleler.length) {
                    ses.konus(cumleler[i].trim());
                    i++;
                    setTimeout(oku, 2500 + cumleler[i - 1].length * 60);
                }
            };
            oku();
        });
        // Türkçe çeviriyi aç/kapat
        document.getElementById('btn-okuma-cevir').addEventListener('click', () => {
            const ceviri = document.getElementById('okuma-metin-ceviri');
            ceviri.classList.toggle('hidden');
        });
    }
};

/* ==================================================
   6.1) MEANING (Anlam Testi)
   ================================================== */

const MeaningUygulamasi = {
    sorular: [],
    suankiSoru: 0,
    dogru: 0,
    yanlis: 0,
    cevapSecildi: false,

    baslat() {
        this.sorulariUret();
        this.olaylariBagla();
        this.soruGoster();
    },

    sorulariUret() {
        // Havuzdan 10 rastgele kelime seç
        const rastgeleKelimeler = [...KELIMELER].sort(() => Math.random() - 0.5).slice(0, 10);
        
        this.sorular = rastgeleKelimeler.map((item) => {
            // Doğru cevap
            const dogru = item.tr;
            
            // Diğer tüm anlamlardan rastgele 3 çeldirici seç
            const digerAnlamlar = KELIMELER
                .filter(k => k.tr !== dogru)
                .map(k => k.tr);
            
            const secilenCeldiriciler = [];
            while(secilenCeldiriciler.length < 3 && digerAnlamlar.length > 0) {
                const idx = Math.floor(Math.random() * digerAnlamlar.length);
                const val = digerAnlamlar.splice(idx, 1)[0];
                if(!secilenCeldiriciler.includes(val)) {
                    secilenCeldiriciler.push(val);
                }
            }

            return {
                kelime: item.w,
                telaffuz: item.pron || '',
                seviye: item.lv || 'A1',
                dogru: dogru,
                secenekler: [dogru, ...secilenCeldiriciler].sort(() => Math.random() - 0.5)
            };
        });

        this.suankiSoru = 0;
        this.dogru = 0;
        this.yanlis = 0;
        this.cevapSecildi = false;
    },

    soruGoster() {
        const s = this.sorular[this.suankiSoru];
        if (!s) return;

        document.getElementById('mean-kelime').textContent = s.kelime;
        document.getElementById('mean-telaffuz').textContent = s.telaffuz;
        document.getElementById('mean-seviye').textContent = s.seviye;
        document.getElementById('mean-ilerleme').textContent = `Soru ${this.suankiSoru + 1} / ${this.sorular.length}`;
        document.getElementById('mean-dogru').textContent = this.dogru;
        document.getElementById('mean-yanlis').textContent = this.yanlis;

        const kutu = document.getElementById('mean-secenekler');
        kutu.innerHTML = '';
        s.secenekler.forEach((cep) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = cep;
            btn.onclick = () => this.secenekTikla(btn, cep);
            kutu.appendChild(btn);
        });

        this.cevapSecildi = false;
        document.getElementById('mean-geri').classList.add('hidden');
        document.getElementById('btn-mean-sonraki').disabled = true;
    },

    secenekTikla(btn, secilen) {
        if (this.cevapSecildi) return;
        this.cevapSecildi = true;

        const s = this.sorular[this.suankiSoru];
        const geri = document.getElementById('mean-geri');
        const ops = document.querySelectorAll('#mean-secenekler .quiz-option');

        if (secilen === s.dogru) {
            this.dogru++;
            btn.classList.add('dogru-secim');
            geri.className = 'quiz-feedback dogru';
            geri.textContent = `🎉 Tebrikler! "${s.kelime}" → ${s.dogru}`;
        } else {
            this.yanlis++;
            btn.classList.add('yanlis-secim');
            ops.forEach(o => { if(o.textContent === s.dogru) o.classList.add('dogru-secim'); });
            geri.className = 'quiz-feedback yanlis';
            geri.textContent = `😅 Yanlış! "${s.kelime}" kelimesinin anlamı: ${s.dogru}`;
        }

        document.getElementById('mean-dogru').textContent = this.dogru;
        document.getElementById('mean-yanlis').textContent = this.yanlis;
        document.getElementById('btn-mean-sonraki').disabled = false;
        geri.classList.remove('hidden');
    },

    sonrakiSoru() {
        if (this.suankiSoru < this.sorular.length - 1) {
            this.suankiSoru++;
            this.soruGoster();
        } else {
            SiteKoruma.toast(`🎮 Tur Tamamlandı! Doğru: ${this.dogru} · Yanlış: ${this.yanlis}`);
            this.sorulariUret();
            this.soruGoster();
        }
    },

    olaylariBagla() {
        document.getElementById('btn-mean-sonraki').onclick = () => this.sonrakiSoru();
        document.getElementById('btn-mean-yeniden').onclick = () => {
            this.sorulariUret();
            this.soruGoster();
        };
        document.getElementById('btn-mean-ses').onclick = () => {
            const s = this.sorular[this.suankiSoru];
            if (s) ses.konus(s.kelime);
        };
    }
};

/* ==================================================
   6) EŞ ANLAMLI & ZIT ANLAMLI (4 şıklı seçim)
   ================================================== */

/* ==================================================
   6.2) MEANING V2 (English Definition Test)
   ================================================== */

const MeaningV2Uygulamasi = {
    sorular: [],
    suankiSoru: 0,
    dogru: 0,
    yanlis: 0,
    cevapSecildi: false,

    baslat() {
        this.sorulariUret();
        this.olaylariBagla();
        this.soruGoster();
    },

    sorulariUret() {
        const rastgeleDeflar = [...DEFINITIONS].sort(() => Math.random() - 0.5).slice(0, 10);
        
        this.sorular = rastgeleDeflar.map((item) => {
            const dogruDef = item.def;
            const digerDefs = DEFINITIONS
                .filter(d => d.def !== dogruDef)
                .map(d => d.def);
            
            const secilenCeldiriciler = [];
            while(secilenCeldiriciler.length < 3 && digerDefs.length > 0) {
                const idx = Math.floor(Math.random() * digerDefs.length);
                const val = digerDefs.splice(idx, 1)[0];
                if(!secilenCeldiriciler.includes(val)) {
                    secilenCeldiriciler.push(val);
                }
            }

            const originalData = KELIMELER.find(k => k.w === item.w) || {};

            return {
                kelime: item.w,
                telaffuz: originalData.pron || '',
                seviye: originalData.lv || 'General',
                dogru: dogruDef,
                secenekler: [dogruDef, ...secilenCeldiriciler].sort(() => Math.random() - 0.5)
            };
        });

        this.suankiSoru = 0;
        this.dogru = 0;
        this.yanlis = 0;
        this.cevapSecildi = false;
    },

    soruGoster() {
        const s = this.sorular[this.suankiSoru];
        if (!s) return;

        document.getElementById('mean-kelime').textContent = s.kelime;
        document.getElementById('mean-telaffuz').textContent = s.telaffuz;
        document.getElementById('mean-seviye').textContent = s.seviye;
        document.getElementById('mean-ilerleme').textContent = `Question ${this.suankiSoru + 1} / ${this.sorular.length}`;
        document.getElementById('mean-dogru').textContent = this.dogru;
        document.getElementById('mean-yanlis').textContent = this.yanlis;

        const kutu = document.getElementById('mean-secenekler');
        kutu.innerHTML = '';
        s.secenekler.forEach((cep) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = cep;
            btn.onclick = () => this.secenekTikla(btn, cep);
            kutu.appendChild(btn);
        });

        this.cevapSecildi = false;
        document.getElementById('mean-geri').classList.add('hidden');
        document.getElementById('btn-mean-sonraki').disabled = true;
    },

    secenekTikla(btn, secilen) {
        if (this.cevapSecildi) return;
        this.cevapSecildi = true;

        const s = this.sorular[this.suankiSoru];
        const geri = document.getElementById('mean-geri');
        const ops = document.querySelectorAll('#mean-secenekler .quiz-option');

        if (secilen === s.dogru) {
            this.dogru++;
            btn.classList.add('dogru-secim');
            geri.className = 'quiz-feedback dogru';
            geri.textContent = `🎉 Correct! "${s.kelime}" means: ${s.dogru}`;
        } else {
            this.yanlis++;
            btn.classList.add('yanlis-secim');
            ops.forEach(o => { if(o.textContent === s.dogru) o.classList.add('dogru-secim'); });
            geri.className = 'quiz-feedback yanlis';
            geri.textContent = `😅 Wrong! The meaning of "${s.kelime}" is: ${s.dogru}`;
            YanlisKaydedici.kaydet({
                id: 'meaning|' + s.kelime,
                tip: 'meaning',
                kelime: s.kelime,
                verdi: secilen,
                dogru: s.dogru
            });
        }

        document.getElementById('mean-dogru').textContent = this.dogru;
        document.getElementById('mean-yanlis').textContent = this.yanlis;
        document.getElementById('btn-mean-sonraki').disabled = false;
        geri.classList.remove('hidden');
    },

    sonrakiSoru() {
        if (this.suankiSoru < this.sorular.length - 1) {
            this.suankiSoru++;
            this.soruGoster();
        } else {
            SiteKoruma.toast(`🎮 Tur Tamamlandı! Doğru: ${this.dogru} · Yanlış: ${this.yanlis}`);
            this.sorulariUret();
            this.soruGoster();
        }
    },

    olaylariBagla() {
        document.getElementById('btn-mean-sonraki').onclick = () => this.sonrakiSoru();
        document.getElementById('btn-mean-yeniden').onclick = () => {
            this.sorulariUret();
            this.soruGoster();
        };
        document.getElementById('btn-mean-ses').onclick = () => {
            const s = this.sorular[this.suankiSoru];
            if (s) ses.konus(s.kelime);
        };
    }
};

// Çeldirici üretimi için ortak yardımcı: verilen kelime dışında
// İngilizce kelime havuzundan rastgele 3 yanlış şık üretir
function celdiriciUret(dogruKelime, celdiriciHavuz) {
    const yanlislar = celdiriciHavuz
        .map((c) => c.w)
        .filter((w) => w.toLowerCase() !== dogruKelime.toLowerCase());
    // karıştır ve 3 tane al
    for (let i = yanlislar.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [yanlislar[i], yanlislar[j]] = [yanlislar[j], yanlislar[i]];
    }
    return yanlislar.slice(0, 3);
}

const EsAnlamUygulamasi = {
    sorular: [],
    suankiSoru: 0,
    dogru: 0,
    yanlis: 0,
    cevapSecildi: false,

    baslat() {
        this.sorulariUret();
        this.olaylariBagla();
        this.soruGoster();
    },

    sorulariUret() {
        // 10 rastgele eş anlamlı çifti seç, her biri için 4 şık hazırla
        const karisik = [...ES_ANLAMLILAR].sort(() => Math.random() - 0.5);
        this.sorular = karisik
            .slice(0, 10)
            .map((cift) => ({
                cift: cift,
                secenekler: this.secenekHazirla(cift)
            }));
        this.suankiSoru = 0;
        this.dogru = 0;
        this.yanlis = 0;
        this.cevapSecildi = false;
    },

    secenekHazirla(cift) {
        // Doğru + 3 çeldirici (KELIMELER ve BOTH listelerinden)
        const celdiriciler = celdiriciUret(cift.dogru, ES_ANLAMLILAR);
        return [cift.dogru, ...celdiriciler].sort(() => Math.random() - 0.5);
    },

    soruGoster() {
        const s = this.sorular[this.suankiSoru];
        if (!s) return;
        document.getElementById('es-kelime').textContent = s.cift.w;
        document.getElementById('es-ipucu').textContent = `eş anlamlısı?`;
        document.getElementById('es-ilerleme').textContent = `Soru ${this.suankiSoru + 1} / ${this.sorular.length}`;
        document.getElementById('es-dogru').textContent = this.dogru;
        document.getElementById('es-yanlis').textContent = this.yanlis;

        const kutu = document.getElementById('es-secenekler');
        kutu.innerHTML = '';
        s.secenekler.forEach((cevap) => {
            const buton = document.createElement('button');
            buton.className = 'quiz-option';
            buton.textContent = cevap;
            buton.addEventListener('click', () => this.secenekTikla(buton, cevap));
            kutu.appendChild(buton);
        });

        this.cevapSecildi = false;
        document.getElementById('es-geri').classList.add('hidden');
        document.getElementById('btn-es-sonraki').disabled = true;
    },

    secenekTikla(buton, secilen) {
        if (this.cevapSecildi) return;
        this.cevapSecildi = true;
        const s = this.sorular[this.suankiSoru];
        const geri = document.getElementById('es-geri');
        const tum = document.querySelectorAll('#es-secenekler .quiz-option');

        if (secilen === s.cift.dogru) {
            this.dogru++;
            buton.classList.add('dogru-secim');
            geri.className = 'quiz-feedback dogru';
            geri.textContent = `🎉 Doğru! "${s.cift.w}" → "${s.cift.dogru}"`;
        } else {
            this.yanlis++;
            buton.classList.add('yanlis-secim');
            tum.forEach((opt) => {
                if (opt.textContent === s.cift.dogru) opt.classList.add('dogru-secim');
            });
            geri.className = 'quiz-feedback yanlis';
            geri.textContent = `😅 Yanlış! Doğrusu: "${s.cift.w}" → "${s.cift.dogru}"`;
            YanlisKaydedici.kaydet({
                id: 'es|' + s.cift.w,
                tip: 'es',
                kelime: s.cift.w,
                verdi: secilen,
                dogru: s.cift.dogru
            });
        }
        document.getElementById('es-dogru').textContent = this.dogru;
        document.getElementById('es-yanlis').textContent = this.yanlis;
        document.getElementById('btn-es-sonraki').disabled = false;
    },

    sonrakiSoru() {
        if (this.suankiSoru < this.sorular.length - 1) {
            this.suankiSoru++;
            this.soruGoster();
        } else {
            SiteKoruma.toast(`🎉 Tamamlandı! ${this.dogru} doğru, ${this.yanlis} yanlış.`);
            this.sorulariUret();
            this.soruGoster();
        }
    },

    olaylariBagla() {
        document.getElementById('btn-es-sonraki').addEventListener('click', () => this.sonrakiSoru());
        document.getElementById('btn-es-yeniden').addEventListener('click', () => {
            this.sorulariUret();
            this.soruGoster();
        });
        document.getElementById('btn-es-ses').addEventListener('click', () => {
            const s = this.sorular[this.suankiSoru];
            if (s) ses.konus(s.cift.w);
        });
    }
};

const ZitAnlamUygulamasi = {
    sorular: [],
    suankiSoru: 0,
    dogru: 0,
    yanlis: 0,
    cevapSecildi: false,

    baslat() {
        this.sorulariUret();
        this.olaylariBagla();
        this.soruGoster();
    },

    sorulariUret() {
        const karisik = [...ZIT_ANLAMLILAR].sort(() => Math.random() - 0.5);
        this.sorular = karisik
            .slice(0, 10)
            .map((cift) => ({
                cift: cift,
                secenekler: this.secenekHazirla(cift)
            }));
        this.suankiSoru = 0;
        this.dogru = 0;
        this.yanlis = 0;
        this.cevapSecildi = false;
    },

    secenekHazirla(cift) {
        const celdiriciler = celdiriciUret(cift.dogru, ZIT_ANLAMLILAR);
        return [cift.dogru, ...celdiriciler].sort(() => Math.random() - 0.5);
    },

    soruGoster() {
        const s = this.sorular[this.suankiSoru];
        if (!s) return;
        document.getElementById('zi-kelime').textContent = s.cift.w;
        document.getElementById('zi-ipucu').textContent = `zıt anlamlısı?`;
        document.getElementById('zi-ilerleme').textContent = `Soru ${this.suankiSoru + 1} / ${this.sorular.length}`;
        document.getElementById('zi-dogru').textContent = this.dogru;
        document.getElementById('zi-yanlis').textContent = this.yanlis;

        const kutu = document.getElementById('zi-secenekler');
        kutu.innerHTML = '';
        s.secenekler.forEach((cevap) => {
            const buton = document.createElement('button');
            buton.className = 'quiz-option';
            buton.textContent = cevap;
            buton.addEventListener('click', () => this.secenekTikla(buton, cevap));
            kutu.appendChild(buton);
        });

        this.cevapSecildi = false;
        document.getElementById('zi-geri').classList.add('hidden');
        document.getElementById('btn-zi-sonraki').disabled = true;
    },

    secenekTikla(buton, secilen) {
        if (this.cevapSecildi) return;
        this.cevapSecildi = true;
        const s = this.sorular[this.suankiSoru];
        const geri = document.getElementById('zi-geri');
        const tum = document.querySelectorAll('#zi-secenekler .quiz-option');

        if (secilen === s.cift.dogru) {
            this.dogru++;
            buton.classList.add('dogru-secim');
            geri.className = 'quiz-feedback dogru';
            geri.textContent = `🎉 Doğru! "${s.cift.w}" ↔ "${s.cift.dogru}"`;
        } else {
            this.yanlis++;
            buton.classList.add('yanlis-secim');
            tum.forEach((opt) => {
                if (opt.textContent === s.cift.dogru) opt.classList.add('dogru-secim');
            });
            geri.className = 'quiz-feedback yanlis';
            geri.textContent = `😅 Yanlış! Doğrusu: "${s.cift.w}" ↔ "${s.cift.dogru}"`;
            YanlisKaydedici.kaydet({
                id: 'zi|' + s.cift.w,
                tip: 'zi',
                kelime: s.cift.w,
                verdi: secilen,
                dogru: s.cift.dogru
            });
        }
        document.getElementById('zi-dogru').textContent = this.dogru;
        document.getElementById('zi-yanlis').textContent = this.yanlis;
        document.getElementById('btn-zi-sonraki').disabled = false;
    },

    sonrakiSoru() {
        if (this.suankiSoru < this.sorular.length - 1) {
            this.suankiSoru++;
            this.soruGoster();
        } else {
            SiteKoruma.toast(`🎉 Tamamlandı! ${this.dogru} doğru, ${this.yanlis} yanlış.`);
            this.sorulariUret();
            this.soruGoster();
        }
    },

    olaylariBagla() {
        document.getElementById('btn-zi-sonraki').addEventListener('click', () => this.sonrakiSoru());
        document.getElementById('btn-zi-yeniden').addEventListener('click', () => {
            this.sorulariUret();
            this.soruGoster();
        });
        document.getElementById('btn-zi-ses').addEventListener('click', () => {
            const s = this.sorular[this.suankiSoru];
            if (s) ses.konus(s.cift.w);
        });
    }
};

/* ==================================================
   9) SÖZLÜK (Kelime Arama & Detay)
   ================================================== */
const SozlukUygulamasi = {
    seciliKelime: null,

    baslat() {
        this.olaylariBagla();
        // Varsayılan olarak bir örnek göster
        this.aramaYap('travel');
    },

    olaylariBagla() {
        const arama = document.getElementById('sozluk-arama');

        // Yazdıkça filtrele
        arama.addEventListener('input', () => {
            const sorgu = arama.value.trim();
            if (!sorgu) {
                this.sonuclariBosalt('Hazırsın! Bir kelime yazmaya başla. 😊');
                this.detayiGizle();
                return;
            }
            this.aramaYap(sorgu);
        });

        // Enter ile ilk sonucu aç
        arama.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const ilk = document.querySelector('#sozluk-sonuclar .sozluk-sonuc');
                if (ilk) this.kelimeSec(ilk);
            }
        });

        // Temizle
        document.getElementById('btn-sozluk-temizle').addEventListener('click', () => {
            arama.value = '';
            this.sonuclariBosalt('Hazırsın! Bir kelime yazmaya başla. 😊');
            this.detayiGizle();
            arama.focus();
        });

        // Ses
        document.getElementById('btn-sozluk-ses').addEventListener('click', () => {
            if (this.seciliKelime) ses.konus(this.seciliKelime.w);
        });

        // Listeme ekle/çıkar
        const sfav = document.getElementById('btn-sozluk-favori');
        if (sfav) sfav.addEventListener('click', () => {
            if (typeof FavorilerUygulamasi === 'undefined' || !this.seciliKelime) return;
            FavorilerUygulamasi.cekCevir(this.seciliKelime);
            this.favoriDurumGuncelle();
            FavorilerUygulamasi.rozet();
        });
    },

    favoriDurumGuncelle() {
        const b = document.getElementById('btn-sozluk-favori');
        if (!b) return;
        const on = this.seciliKelime && typeof FavorilerUygulamasi !== 'undefined' && FavorilerUygulamasi.icinde(this.seciliKelime.w);
        b.textContent = on ? '⭐' : '☆';
        b.title = on ? 'Listemden çıkar' : 'Listeme ekle';
        b.classList.toggle('aktif', !!on);
    },

    aramaYap(sorgu) {
        const s = sorgu.toLowerCase();
        const ham = KELIMELER.filter((k) =>
            (k.w && k.w.toLowerCase().includes(s)) ||
            (k.tr && k.tr.toLowerCase().includes(s)));

        const notVer = (k) => {
            const w = (k.w || '').toLowerCase();
            const t = (k.tr || '').toLowerCase();
            if (w === s) return 1000;
            if (w.startsWith(s)) return 600;
            if (w.includes(s)) return 400;
            if (t.startsWith(s)) return 300;
            if (t.includes(s)) return 200;
            return 0;
        };

        // Alaka sırası + aynı yazımın yalnızca en iyi anlamı
        const sirali = ham
            .map((k) => ({ k, n: notVer(k) }))
            .sort((a, b) => b.n - a.n || a.k.w.localeCompare(b.k.w));
        const toplam = new Set();
        const sonuclar = [];
        for (const { k } of sirali) {
            toplam.add(k.w.toLowerCase());
            if (toplam.size <= 40) sonuclar.push(k);
        }

        if (sonuclar.length === 0) {
            this.sonuclariBosalt(`"${sorgu}" için sonuç bulunamadı. 😕`);
            this.detayiGizle();
            return;
        }

        const toplamSayi = toplam.size;
        document.getElementById('sozluk-bilgi').textContent = `${toplamSayi} sonuç bulundu.`;
        const kutu = document.getElementById('sozluk-sonuclar');
        kutu.innerHTML = '';
        sonuclar.forEach((k) => {
            const satir = document.createElement('div');
            satir.className = 'sozluk-sonuc';
            if (this.seciliKelime && this.seciliKelime.w === k.w) satir.classList.add('secili');
            satir.innerHTML = `
                <div class="sozluk-sonuc-ust">
                    <strong>${k.w}</strong>
                    <span class="sozluk-sonuc-lv">${k.lv}</span>
                    <button class="sozluk-fav" title="Listeme ekle/çıkar">☆</button>
                </div>
                <span class="sozluk-sonuc-tr">${k.tr}</span>`;
            satir.addEventListener('click', () => this.kelimeSec(satir, k));
            const fav = satir.querySelector('.sozluk-fav');
            if (fav) {
                fav.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof FavorilerUygulamasi === 'undefined') return;
                    FavorilerUygulamasi.cekCevir(k);
                    this.sozlukFavoriButonlariGuncelle();
                    FavorilerUygulamasi.rozet();
                });
            }
            kutu.appendChild(satir);
        });
        this.sozlukFavoriButonlariGuncelle();
    },

    sozlukFavoriButonlariGuncelle() {
        if (typeof FavorilerUygulamasi === 'undefined') return;
        document.querySelectorAll('#sozluk-sonuclar .sozluk-sonuc').forEach((satir) => {
            const btn = satir.querySelector('.sozluk-fav');
            if (!btn) return;
            const strong = satir.querySelector('strong');
            const kelime = strong ? strong.textContent : '';
            const on = FavorilerUygulamasi.icinde(kelime);
            btn.textContent = on ? '⭐' : '☆';
            btn.classList.toggle('aktif', on);
        });
    },

    kelimeSec(satir, kelime) {
        this.seciliKelime = kelime;
        document.querySelectorAll('#sozluk-sonuclar .sozluk-sonuc').forEach((s) => s.classList.remove('secili'));
        satir.classList.add('secili');
        this.detayiGoster(kelime);
    },

    detayiGoster(k) {
        document.getElementById('sozluk-kelime').textContent = k.w;
        document.getElementById('sozluk-telaffuz').textContent = k.pr || '';
        document.getElementById('sozluk-anlam').textContent = k.tr;
        document.getElementById('sozluk-seviye').textContent = k.lv;
        document.getElementById('sozluk-kategori').textContent = k.ct || 'genel';
        document.getElementById('sozluk-ornek').textContent = k.ex || '';
        document.getElementById('sozluk-ornek-tr').textContent = k.exTr || '';
        const sf = document.getElementById('sozluk-formlar');
        if (sf) { const t = FiilCekim.metin(k); sf.innerHTML = t; sf.classList.toggle('hidden', !t); }
        document.getElementById('sozluk-detay').classList.remove('hidden');
        // Modül bağlantıları
        const alan = document.getElementById('sozluk-baglantilar');
        if (alan) {
            alan.innerHTML = ModulBaglanti.sozlukBaglanti(k);
            ModulBaglanti.baglaAlani(alan, k);
        }
        this.favoriDurumGuncelle();
    },

    detayiGizle() {
        this.seciliKelime = null;
        document.getElementById('sozluk-detay').classList.add('hidden');
    },

    sonuclariBosalt(mesaj) {
        document.getElementById('sozluk-bilgi').textContent = mesaj;
        document.getElementById('sozluk-sonuclar').innerHTML = '';
    }
};

/* ==================================================
   10) PHRASAL VERBS (Ek Anlamlı Fiiller)
   ================================================== */
const PhrasalUygulamasi = {
    liste: [],
    seciliEk: 'all',
    sorgu: '',

    baslat() {
        // PHRASAL kategorisindeki tüm fiilleri topla
        this.liste = KELIMELER.filter((k) => (k.ct || '').toUpperCase() === 'PHRASAL');
        this.olaylariBagla();
        this.ciz();
    },

    olaylariBagla() {
        const arama = document.getElementById('phrasal-arama');
        arama.addEventListener('input', () => {
            this.sorgu = arama.value.trim().toLowerCase();
            this.ciz();
        });
        arama.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });
        document.getElementById('btn-phrasal-temizle').addEventListener('click', () => {
            arama.value = '';
            this.sorgu = '';
            this.seciliEk = 'all';
            document.querySelectorAll('#phrasal-ek-filtre .diff-chip').forEach((c) => c.classList.remove('active'));
            const tum = document.querySelector('#phrasal-ek-filtre .diff-chip[data-ek="all"]');
            if (tum) tum.classList.add('active');
            this.ciz();
            arama.focus();
        });
        // Ek filtre çipleri
        document.querySelectorAll('#phrasal-ek-filtre .diff-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('#phrasal-ek-filtre .diff-chip').forEach((c) => c.classList.remove('active'));
                chip.classList.add('active');
                this.seciliEk = chip.dataset.ek;
                this.ciz();
            });
        });
    },

    ciz() {
        let sonuc = this.liste;
        // Ek filtresi
        if (this.seciliEk !== 'all') {
            sonuc = sonuc.filter((k) => {
                const parcalar = k.w.split(' ');
                return parcalar.length > 1 && parcalar[parcalar.length - 1] === this.seciliEk;
            });
        }
        // Arama
        if (this.sorgu) {
            sonuc = sonuc.filter((k) =>
                k.w.toLowerCase().includes(this.sorgu) ||
                (k.tr || '').toLowerCase().includes(this.sorgu)
            );
        }
        // Sırala
        sonuc = sonuc.slice().sort((a, b) => a.w.localeCompare(b.w));

        document.getElementById('phrasal-bilgi').textContent =
            sonuc.length === this.liste.length
                ? `${this.liste.length} deyimsel fiil listeleniyor.`
                : `${sonuc.length} sonuç (toplam ${this.liste.length}).`;

        const kutu = document.getElementById('phrasal-liste');
        kutu.innerHTML = '';
        if (sonuc.length === 0) {
            kutu.innerHTML = '<p class="tip">Sonuç bulunamadı. 😕</p>';
            return;
        }
        sonuc.forEach((k) => {
            const satir = document.createElement('div');
            satir.className = 'phrasal-satir';
            const ek = k.w.split(' ').slice(1).join(' ');
            satir.innerHTML = `
                <button class="sound-btn small" title="Dinle">🔊</button>
                <div class="phrasal-govde">
                    <div class="phrasal-ust">
                        <strong>${k.w}</strong>
                        <span class="phrasal-ek">${ek}</span>
                        <span class="sozluk-sonuc-lv">${k.lv}</span>
                    </div>
                    <div class="phrasal-anlam">${k.tr}</div>
                    <div class="phrasal-ornek">${k.ex || ''}</div>
                    <div class="phrasal-ornek-tr">${k.exTr || ''}</div>
                </div>`;
            satir.querySelector('.sound-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                ses.konus(k.w);
            });
            kutu.appendChild(satir);
        });
    }
};

/* ==================================================
   11) KELİME KOŞUSU (arcade oyunu)
   Düşen kutulardan doğru anlamı yakala!
   ================================================== */
const KosuUygulamasi = {
    basladi: false,
    can: 3,
    skor: 0,
    kombo: 0,
    enIyi: 0,
    hiz: 1.5,
    rafId: null,
    soru: null,
    kutular: [],
    kayitAnahtari: 'englearn-kosu-en-iyi',

    baslat() {
        try {
            this.enIyi = Number(localStorage.getItem(this.kayitAnahtari) || 0);
        } catch (e) {}
        document.getElementById('kosu-en-iyi').textContent = `En iyi: ${this.enIyi}`;

        document.getElementById('btn-kosu-ekran-baslat').addEventListener('click', () => this.oyunBasla());
        document.getElementById('btn-kosu-ekran-yeniden').addEventListener('click', () => this.oyunBasla());
        document.getElementById('btn-kosu-ses').addEventListener('click', () => {
            if (this.soru) ses.konus(this.soru.kelime.w);
        });

        // OLAY DELEGASYONU: veiren alan üzerinde pointerdown ile anında yakala.
        // Kutu hızla haraket etse de "bas" anındaki kutu doğru yakalanır (click'teki gibi kaçmaz).
        const alan = document.getElementById('kosu-alan');
        alan.addEventListener('pointerdown', (e) => {
            if (!this.basladi) return;
            const kutu = e.target.closest('.kosu-kutu-dusen');
            if (!kutu) return;
            e.preventDefault();         // sürükleme/metin seçimini engelle
            const cevap = kutu.textContent;
            this.kutuTikla(kutu, cevap);
        });
        // Alanın kendisine tıklamak oyunu etkilemesin
        alan.addEventListener('click', (e) => {
            if (e.target.classList && e.target.classList.contains('kosu-kutu-dusen')) return;
        });
    },

    oyunBasla() {
        this.can = 3;
        this.skor = 0;
        this.kombo = 0;
        this.hiz = 1.5;
        this.basladi = true;
        this.kutulariTemizle();
        this.soruUret();
        this.bilgiGuncelle();
        document.getElementById('kosu-ekran-baslangic').classList.add('hidden');
        document.getElementById('kosu-ekran-bitti').classList.add('hidden');
        this.durbasla();
    },

    soruUret() {
        const cekilen = [...KELIMELER].sort(() => Math.random() - 0.5)[0];
        const dogru = cekilen.tr;
        const yanlislar = KELIMELER
            .filter((k) => k.tr !== dogru)
            .map((k) => k.tr);
        const celdiriciler = [];
        while (celdiriciler.length < 3 && yanlislar.length > 0) {
            const i = Math.floor(Math.random() * yanlislar.length);
            const deger = yanlislar.splice(i, 1)[0];
            if (!celdiriciler.includes(deger)) celdiriciler.push(deger);
        }
        const secenekler = [dogru, ...celdiriciler].sort(() => Math.random() - 0.5);
        this.soru = { kelime: cekilen, dogru: dogru, secenekler: secenekler };

        document.getElementById('kosu-kelime').textContent = cekilen.w;
        document.getElementById('kosu-seviye').textContent = cekilen.lv;
        this.spawn();
    },

    spawn() {
        this.kutulariTemizle();
        const alan = document.getElementById('kosu-alan');
        const genislik = alan.clientWidth;
        const kutuGenislik = 154;              // 150 + 3px kenarlık *2
        const bosluk = 10;
        const laneler = 4;
        const pay = kutuGenislik + bosluk;
        // Şeritleri ortala (genişlik yetmezse sola dayalı)
        const baslangic = Math.max(4, (genislik - (laneler * pay - bosluk)) / 2);
        // Şeritleri karıştır ki her yeni soruda farklı sütunlara düşsün
        const karisikLane = [0, 1, 2, 3].sort(() => Math.random() - 0.5);

        this.soru.secenekler.forEach((cevap, idx) => {
            const kutu = document.createElement('div');
            kutu.className = 'kosu-kutu-dusen';
            kutu.textContent = cevap;
            kutu.dataset.dogru = cevap === this.soru.dogru ? '1' : '0';
            const lane = karisikLane[idx % laneler];
            const left = Math.max(4, Math.min(genislik - kutuGenislik - 4, baslangic + lane * pay));
            const top = -80 - Math.random() * 110;    // dikey dağıt → aynı anda binmesinler
            kutu.style.left = `${left}px`;
            kutu.style.top = `${top}px`;
            alan.appendChild(kutu);
            this.kutular.push(kutu);   // tıklama: konteyner üzerindeki pointerdown delegasyonu yönetir
        });
    },

    durbasla() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        const adim = () => {
            if (!this.basladi) return;
            const alan = document.getElementById('kosu-alan');
            const sinir = alan.clientHeight + 20;
            this.kutular.forEach((kutu, i) => {
                if (!kutu.isConnected) return;
                const ust = parseFloat(kutu.style.top || '-75');
                kutu.style.top = `${ust + this.hiz}px`;
                if (ust > sinir) {
                    // kutunun zemine düşmesi
                    if (kutu.dataset.dogru === '1') {
                        kutu.remove();
                        this.kutular.splice(i, 1);
                        // Doğru kutu kaçtı → can kaybet
                        this.canKaybet();
                    } else {
                        kutu.remove();
                        this.kutular.splice(i, 1);
                    }
                }
            });
            this.rafId = requestAnimationFrame(adim);
        };
        this.rafId = requestAnimationFrame(adim);
    },

    kutuTikla(kutu, cevap) {
        if (!this.basladi) return;
        if (cevap === this.soru.dogru) {
            this.kombo++;
            this.skor += 10 * this.kombo;
            this.hiz = Math.min(5, 1.5 + this.skor * 0.02);
            this.bip(true);
            ses.konus(this.soru.kelime.w);
            this.bilgiGuncelle();
            this.soruUret();
        } else {
            kutu.style.transform = 'scale(0.85)';
            this.bip(false);
            this.kombo = 0;
            this.can--;
            this.bilgiGuncelle();
            YanlisKaydedici.kaydet({
                id: 'kosu|' + this.soru.kelime.w,
                tip: 'kosu',
                kelime: this.soru.kelime.w,
                verdi: cevap,
                dogru: this.soru.kelime.tr
            });
            kutu.remove();
            if (this.can <= 0) this.oyunBitti();
        }
    },

    canKaybet() {
        this.kombo = 0;
        this.can--;
        this.bip(false);
        this.bilgiGuncelle();
        if (this.can <= 0) {
            this.oyunBitti();
        } else {
            this.soruUret(); // yeni soru
        }
    },

    bilgiGuncelle() {
        document.getElementById('kosu-skor').textContent = `Skor: ${this.skor}`;
        document.getElementById('kosu-kombo').textContent = `🔥 x${Math.max(1, this.kombo)}`;
        document.getElementById('kosu-can').textContent = '❤️'.repeat(Math.max(0, this.can)) + '🖤'.repeat(Math.max(0, 3 - this.can));
    },

    oyunBitti() {
        this.basladi = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.kutulariTemizle();
        if (this.skor > this.enIyi) {
            this.enIyi = this.skor;
            try { localStorage.setItem(this.kayitAnahtari, String(this.enIyi)); } catch (e) {}
        }
        document.getElementById('kosu-en-iyi').textContent = `En iyi: ${this.enIyi}`;
        document.getElementById('kosu-bitti-skor').textContent = `Skorun: ${this.skor}`;
        const mesaj = this.skor >= 300 ? '🏆 Muhteşem! Kelime koşucusu sensin!' :
                      this.skor >= 150 ? '💪 Süpersin! Az kaldı zirveye.' :
                      '📚 İyi başlangıç! Tekrar dene, hızlanacaksın.';
        document.getElementById('kosu-bitti-mesaj').textContent = mesaj;
        document.getElementById('kosu-ekran-bitti').classList.remove('hidden');
    },

    kutulariTemizle() {
        this.kutular.forEach((k) => k.remove());
        this.kutular = [];
    },

    bip(dogru) {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = dogru ? 660 : 220;
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.18);
        } catch (e) {}
    }
};

/* ==================================================
   12) YANLIŞLARIM (yanlış cevapları topla + tekrar)
   ================================================== */
/* ==================================================
   AKILLI TEKRAR SİSTEMİ (Aralıklı Tekrar — SM-2 lite)
   - Her kelime: etap(a), aralık(i), ease(e), sonraki(n)
   - Doğru → aralık uzar; yanlış → sahne sıfırlanır, erken sorulur
   ================================================== */
const AkilliTekrar = {
    anahtar: 'englearn-srs',
    kayitlar: {},          // key -> {a,i,e,n,y,d,w,tr,lv,ct}
    DAK: 60 * 1000,
    GUN: 24 * 60 * 60 * 1000,

    anahtarAl(k) {
        return ((k.w || '') + '\u0001' + (k.tr || '')).toLowerCase();
    },

    yukle() {
        this.kayitlar = {};
        try {
            const ham = JSON.parse(localStorage.getItem(this.anahtar) || '{}');
            for (const key of Object.keys(ham)) {
                const r = ham[key];
                if (r && typeof r.a === 'number') this.kayitlar[key] = r;
            }
        } catch (e) { this.kayitlar = {}; }
        this.yukleGunluk();
    },

    kaydet() {
        try { localStorage.setItem(this.anahtar, JSON.stringify(this.kayitlar)); } catch (e) {}
    },

    kayitOlustur(k) {
        const key = this.anahtarAl(k);
        let r = this.kayitlar[key];
        if (!r) {
            r = { a: 0, i: 0, e: 2.5, n: 0, y: 0, d: 0, ilk: Date.now(),
                  w: k.w || '', tr: k.tr || '', lv: k.lv || '', ct: k.ct || '' };
            this.kayitlar[key] = r;
        }
        return r;
    },

    // Kelimeyi plana hemen ekle (bugünkü tekrara çıksın, istatistik değişmez)
    planaEkle(k) {
        const r = this.kayitOlustur(k);
        r.i = 1;
        r.n = Date.now();
        this.kaydet();
    },

    // not: 0 görmedim/bilmiyorum · 1 tekrar · 3 zor · 4 iyi · 5 kolay
    cevapla(k, not) {
        const r = this.kayitOlustur(k);
        const simdi = Date.now();

        if (not <= 1) {
            // Bilmiyorum / görmedim: sahne sıfırlanır, kısa sürede yeniden
            r.a = 0;
            r.i = 1;
            r.y++;
            r.e = Math.max(1.3, r.e - 0.2);
            r.n = simdi + (not === 0 ? 10 * this.DAK : this.GUN);
        } else if (not === 3) {
            // Zor hatırladım: ilerlemez, kısa ama artan aralık
            r.d++;
            r.i = Math.max(1, Math.round(r.i * r.e));
            r.n = simdi + r.i * this.GUN;
        } else {
            // İyi (4) / Kolay (5): aşama ilerler, aralık büyür
            r.d++;
            r.e = Math.min(3.0, r.e + (not === 5 ? 0.1 : 0.02));
            r.a++;
            if (r.a === 1) r.i = not === 5 ? 2 : 1;
            else if (r.a === 2) r.i = not === 5 ? 5 : 3;
            else if (r.a === 3) r.i = not === 5 ? 12 : 7;
            else r.i = Math.round(r.i * r.e);
            r.n = simdi + r.i * this.GUN;
        }
        this.kaydet();
        this.guncelleGunluk();
        return r;
    },

    durum(k) {
        return this.kayitlar[this.anahtarAl(k)] || null;
    },

    siradaki(limit) {
        const simdi = Date.now();
        return Object.values(this.kayitlar)
            .filter((r) => r.n <= simdi)
            .sort((x, y) => (x.n - y.n) || (y.y - x.y))
            .slice(0, limit);
    },

    istatistik() {
        const simdi = Date.now();
        const st = { toplam: 0, yeni: 0, ogren: 0, vade: 0, zorlanan: 0 };
        for (const r of Object.values(this.kayitlar)) {
            st.toplam++;
            if (r.a === 0) st.yeni++; else st.ogren++;
            if (r.n <= simdi) st.vade++;
            if (r.y > r.d) st.zorlanan++;
        }
        return st;
    },

    /* Günlük aktivite günlüğü (haftalık rapor + seri için) */
    gunlukEn: 'englearn-srs-gunluk',
    gunluk: {},

    yukleGunluk() {
        try { this.gunluk = JSON.parse(localStorage.getItem(this.gunlukEn) || '{}'); }
        catch (e) { this.gunluk = {}; }
    },

    tarihG(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    guncelleGunluk() {
        const t = this.tarihG(new Date());
        this.gunluk[t] = (this.gunluk[t] || 0) + 1;
        try { localStorage.setItem(this.gunlukEn, JSON.stringify(this.gunluk)); } catch (e) {}
    },

    seri() {
        // Bugün veya dünden itibaren kesintisiz tekrar yapılan günler
        const gun = new Date();
        if (!this.gunluk[this.tarihG(gun)]) gun.setDate(gun.getDate() - 1);
        let sayac = 0;
        while (this.gunluk[this.tarihG(gun)] > 0) {
            sayac++;
            gun.setDate(gun.getDate() - 1);
            if (sayac > 3650) break;
        }
        return sayac;
    }
};

const YanlisKaydedici = {
    anahtar: 'englearn-yanlislar',
    liste: [],

    yukle() {
        try { this.liste = JSON.parse(localStorage.getItem(this.anahtar) || '[]'); }
        catch (e) { this.liste = []; }
    },

    kaydet(ogr) {
        if (!ogr || !ogr.id) return;
        this.yukle();
        const idx = this.liste.findIndex((i) => i.id === ogr.id);
        if (idx >= 0) this.liste[idx] = ogr;
        else this.liste.push(ogr);
        try { localStorage.setItem(this.anahtar, JSON.stringify(this.liste)); } catch (e) {}
        // Merkezi kanca: her modüldeki yanlış → akıllı tekrara ilet (erken tekrar)
        if (typeof AkilliTekrar !== 'undefined' && ogr && ogr.kelime && ogr.dogru) {
            AkilliTekrar.cevapla({ w: ogr.kelime, tr: ogr.dogru }, 0);
            if (typeof SrsUygulamasi !== 'undefined') SrsUygulamasi.rozetGuncelle();
        }
        if (typeof YanlislarUygulamasi !== 'undefined') YanlislarUygulamasi.rozetGuncelle();
    },

    sil(id) {
        this.liste = this.liste.filter((i) => i.id !== id);
        try { localStorage.setItem(this.anahtar, JSON.stringify(this.liste)); } catch (e) {}
    },

    temizle() {
        this.liste = [];
        try { localStorage.setItem(this.anahtar, '[]'); } catch (e) {}
    }
};

/* ==================================================
   AKILLI TEKRAR PANELİ — kullanıcı arayüzü
   ================================================== */
const SrsUygulamasi = {
    oturum: null,          // {kayitlar:[], sira}
    oturumSes: '',
    oturumGoruldu: false,

    baslat() {
        if (typeof AkilliTekrar === 'undefined') return;
        AkilliTekrar.yukle();
        this.olaylariBagla();
        this.ciz();
        this.rozetGuncelle();
    },

    rozetGuncelle() {
        const rozet = document.getElementById('srs-rozet');
        if (!rozet) return;
        const st = AkilliTekrar.istatistik();
        if (st.vade > 0) {
            rozet.textContent = st.vade;
            rozet.classList.remove('hidden');
        } else {
            rozet.textContent = '';
            rozet.classList.add('hidden');
        }
    },

    ciz() {
        const st = AkilliTekrar.istatistik();
        const bilgi = document.getElementById('srs-bilgi');
        if (bilgi) {
            bilgi.innerHTML = st.toplam === 0
                ? '<span class="tip">Henüz tekrar verisi yok. <b>Kartlar</b> veya <b>Quiz</b> çalışmaya başlayın — doğru ve yanlışların burada akıllıca planlanır.</span>'
                : `📊 Takip: <b>${st.toplam}</b> kelime · Yeni: ${st.yeni} · Öğrenilen: ${st.ogren} · <b>Bugün vadesi: ${st.vade}</b> · Zorlanan: ${st.zorlanan}`;
        }
        const listeEl = document.getElementById('srs-liste');
        if (listeEl) {
            const sira = Object.values(AkilliTekrar.kayitlar)
                .sort((a, b) => a.n - b.n)
                .slice(0, 14);
            if (!sira.length) {
                listeEl.innerHTML = '<div class="tip">Öğrenmeye başladığında kelimeler burada planlanacak.</div>';
            } else {
                listeEl.innerHTML = sira.map((r) => {
                    const gun = Math.max(0, Math.ceil((r.n - Date.now()) / AkilliTekrar.GUN));
                    return `<div class="yanlis-satir">
                        <span class="srs-tip">${r.a === 0 ? '🆕' : '🔁'}</span>
                        <div class="yanlis-govde">
                            <div class="yanlis-soru">${r.w || ''}</div>
                            <div class="yanlis-dogru">${r.tr || ''} · ${r.a === 0 ? 'yeni' : 'aralık: ' + r.i + 'g'} · ${gun} gün sonra</div>
                        </div>
                    </div>`;
                }).join('');
            }
        }
        const btn = document.getElementById('btn-srs-baslat');
        if (btn) btn.textContent = st.vade > 0
            ? `▶️ Tekrar Oturumu Başlat (${st.vade} vadesi geldi)`
            : '▶️ Tekrar Oturumu Başlat';
    },

    olaylariBagla() {
        const duzen = {
            'btn-srs-baslat': () => this.oturumBaslat(),
            'btn-srs-temizle': () => this.sifirla(),
            'btn-srs-anlam-goster': () => this.anlamiGoster(),
            'btn-srs-ses': () => { if (this.oturumSes && typeof ses !== 'undefined') ses.konus(this.oturumSes); },
            'btn-srs-kapat': () => this.oturumKapat(),
            'btn-srs-tekrar-oyna': () => this.oturumBaslat()
        };
        for (const [id, fn] of Object.entries(duzen)) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        }
        document.querySelectorAll('#srs-degerlendir .srs-not').forEach((b) => {
            b.addEventListener('click', () => this.degerlendir(parseInt(b.dataset.not, 10)));
        });
        document.addEventListener('keydown', (e) => {
            if (!this.oturum) return;
            const k = e.key;
            if (k === '1') this.degerlendir(0);
            else if (k === '2') this.degerlendir(3);
            else if (k === '3') this.degerlendir(4);
            else if (k === '4') this.degerlendir(5);
        });
    },

    oturumBaslat() {
        if (typeof AkilliTekrar === 'undefined') return;
        const oturumlar = AkilliTekrar.siradaki(15).map((r) => ({
            w: r.w, tr: r.tr, lv: r.lv, ct: r.ct, pr: r.pr, tip: 'tekrar'
        }));
        // Hafifçe yeni kelime de ekle
        if (typeof KELIMELER !== 'undefined') {
            const mevcut = new Set(Object.keys(AkilliTekrar.kayitlar));
            let hak = 8, deneme = 0;
            while (hak > 0 && deneme < 5000) {
                deneme++;
                const k = KELIMELER[Math.floor(Math.random() * KELIMELER.length)];
                if (!k) continue;
                const key = ((k.w || '') + '\u0001' + (k.tr || '')).toLowerCase();
                if (mevcut.has(key)) continue;
                mevcut.add(key);
                oturumlar.push({ w: k.w, tr: k.tr, lv: k.lv, ct: k.ct, pr: '', tip: 'yeni' });
                hak--;
            }
        }
        if (!oturumlar.length) {
            SiteKoruma.toast('Önce Kartlar veya Quiz ile birkaç kelime çalış!');
            return;
        }
        this.oturum = { kayitlar: oturumlar, sira: 0 };
        this.oturumGoruldu = false;
        const sonuc = document.getElementById('srs-sonuc');
        const ot = document.getElementById('srs-oturum');
        if (sonuc) sonuc.classList.add('hidden');
        if (ot) ot.classList.remove('hidden');
        this.kartGoster();
    },

    kartGoster() {
        const t = this.oturum.kayitlar[this.oturum.sira];
        if (!t) return;
        const tipEl = document.getElementById('srs-kart-tip');
        if (tipEl) tipEl.textContent = t.tip === 'yeni' ? 'Yeni' : (t.lv ? t.lv + ' · Tekrar' : 'Tekrar');
        const ilerleme = document.getElementById('srs-ilerleme');
        if (ilerleme) ilerleme.textContent = `${this.oturum.sira + 1} / ${this.oturum.kayitlar.length}`;
        const kelime = document.getElementById('srs-kart-kelime');
        if (kelime) kelime.textContent = t.w;
        const tel = document.getElementById('srs-kart-telaffuz');
        if (tel) tel.textContent = t.pr || '';
        const anlam = document.getElementById('srs-kart-anlam');
        if (anlam) anlam.textContent = '🇹🇷 ' + (t.tr || '');
        if (anlam) anlam.classList.add('hidden');
        const deg = document.getElementById('srs-degerlendir');
        if (deg) deg.classList.remove('hidden');
        this.oturumGoruldu = false;
        this.oturumSes = t.w;
    },

    anlamiGoster() {
        this.oturumGoruldu = true;
        const anlam = document.getElementById('srs-kart-anlam');
        if (anlam) anlam.classList.remove('hidden');
    },

    degerlendir(not) {
        const t = this.oturum.kayitlar[this.oturum.sira];
        if (!t) return;
        // Yanlış/görmedim ise anlamı kısa süre göster (öğretici geri bildirim)
        if (not <= 1) this.anlamiGoster();
        AkilliTekrar.cevapla({ w: t.w, tr: t.tr, lv: t.lv, ct: t.ct, pr: t.pr }, not);
        this.oturum.sira++;
        if (this.oturum.sira < this.oturum.kayitlar.length) {
            setTimeout(() => this.kartGoster(), not <= 1 ? 450 : 120);
        } else {
            this.oturumSonu();
        }
    },

    oturumSonu() {
        const ot = document.getElementById('srs-oturum');
        if (ot) ot.classList.add('hidden');
        const son = document.getElementById('srs-sonuc');
        const icine = document.getElementById('srs-sonuc-icerik');
        if (son && icine) {
            son.classList.remove('hidden');
            const st = AkilliTekrar.istatistik();
            icine.innerHTML =
                `<h3>✅ Bu oturum bitti!</h3>
                 <p>Vadesi gelen: <b>${st.vade}</b> · Toplam öğrenilen: <b>${st.ogren}</b> · Zorlanan: ${st.zorlanan}</p>
                 <p class="tip">Vadesi gelenler bitmediyse <b>"Bitmeyenleri Tekrarla"</b> ile oturumu yenile.</p>`;
        }
        this.ciz();
        this.rozetGuncelle();
    },

    oturumKapat() {
        const ot = document.getElementById('srs-oturum');
        const son = document.getElementById('srs-sonuc');
        if (ot) ot.classList.add('hidden');
        if (son) son.classList.add('hidden');
        this.ciz();
        this.rozetGuncelle();
    },

    sifirla() {
        if (!confirm('Tüm akıllı tekrar verisi silinsin mi?')) return;
        AkilliTekrar.kayitlar = {};
        AkilliTekrar.kaydet();
        this.ciz();
        this.rozetGuncelle();
    }
};

/* ==================================================
   KİŞİSEL ÖĞRENME PANELİ — seviye testi + günlük plan + gelişim
   ================================================== */
const KisiselPanel = {
    anahtar: 'englearn-seviye',
    planEn: 'englearn-plan',
    test: null,             // {sorular, sira, dogru}
    testSoruldu: false,
    seciliSeviye: null,
    SEVIYELER: ['A2', 'B1', 'B2', 'C1'],

    baslat() {
        this.olaylariBagla();
        this.seviyeGoster();
        this.ciz();
    },

    seviyeGoster() {
        this.seciliSeviye = null;
        try { this.seciliSeviye = localStorage.getItem(this.anahtar); } catch (e) {}
        const durum = document.getElementById('kp-seviye-durum');
        const btn = document.getElementById('btn-kp-seviye-test');
        if (durum) {
            durum.innerHTML = this.seciliSeviye
                ? `Seviyen: <b>${this.seciliSeviye}</b> <span class="tip">(testi tekrar çözerek güncelleyebilirsin)</span>`
                : 'Seviyeni belirle, planın sana uygun olsun!';
        }
        if (btn) btn.textContent = this.seciliSeviye ? '🎓 Testi Tekrarla' : '🎓 Seviye Testini Başlat';
    },

    ciz() {
        this.planCiz();
        this.raporCiz();
    },

    /* ---------- SEVİYE TESTİ ---------- */
    testBaslat() {
        if (typeof KELIMELER === 'undefined' || !KELIMELER.length) {
            SiteKoruma.toast('Kelime havuzu hazır değil.');
            return;
        }
        const sorular = [];
        for (const lv of this.SEVIYELER) {
            const havuz = KELIMELER.filter((k) => k.lv === lv && k.tr);
            let hak = 3, deneme = 0;
            while (hak > 0 && deneme < 600) {
                deneme++;
                const k = havuz[Math.floor(Math.random() * havuz.length)];
                if (!k) break;
                const key = k.w + '\u0001' + k.tr;
                if (sorular.some((s) => s.benzersiz === key)) continue;
                sorular.push({ k, lv, benzersiz: key });
                hak--;
            }
        }
        if (sorular.length < 8) { SiteKoruma.toast('Yeterli soru üretilemedi, tekrar dene.'); return; }
        this.test = { sorular, sira: 0, dogru: { A2: 0, B1: 0, B2: 0, C1: 0 } };
        this.testSoruldu = false;
        const testKutu = document.getElementById('kp-test');
        const sonuc = document.getElementById('kp-test-sonuc');
        if (sonuc) sonuc.classList.add('hidden');
        if (testKutu) testKutu.classList.remove('hidden');
        this.testGoster();
    },

    testGoster() {
        const s = this.test.sorular[this.test.sira];
        document.getElementById('kp-test-ilerleme').textContent = `${this.test.sira + 1} / ${this.test.sorular.length}`;
        const seviyeRozet = document.getElementById('kp-test-seviye');
        if (seviyeRozet) seviyeRozet.textContent = s.lv;
        document.getElementById('kp-test-kelime').textContent = s.k.w;
        this.testSoruldu = false;

        // 4 seçenek: doğru anlam + aynı seviyeden 3 çeldirici
        const secenekler = [s.k.tr];
        const ayni = KELIMELER.filter((x) => x.lv === s.lv && x.tr && x.tr !== s.k.tr);
        for (let i = ayni.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ayni[i], ayni[j]] = [ayni[j], ayni[i]];
        }
        for (const aday of ayni) {
            if (secenekler.length >= 4) break;
            if (!secenekler.includes(aday.tr)) secenekler.push(aday.tr);
        }
        for (let i = secenekler.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [secenekler[i], secenekler[j]] = [secenekler[j], secenekler[i]];
        }

        const al = document.getElementById('kp-test-secenekler');
        al.innerHTML = '';
        secenekler.forEach((sec) => {
            const b = document.createElement('button');
            b.className = 'quiz-option';
            b.textContent = sec;
            b.addEventListener('click', () => this.testCevap(sec, b));
            al.appendChild(b);
        });
        const btn = document.getElementById('btn-kp-test-bitir');
        if (btn) btn.disabled = true;
    },

    testCevap(secilen, buton) {
        if (!this.test || this.testSoruldu) return;
        this.testSoruldu = true;
        const s = this.test.sorular[this.test.sira];
        const dogru = secilen === s.k.tr;
        buton.classList.add(dogru ? 'dogru-secim' : 'yanlis-secim');
        if (dogru) this.test.dogru[s.lv]++;
        const btn = document.getElementById('btn-kp-test-bitir');
        if (btn) btn.disabled = false;
    },

    testIlerle() {
        if (this.test.sira < this.test.sorular.length - 1) {
            this.test.sira++;
            this.testGoster();
            return;
        }
        // Sonuç: en üst seviye başarı oranı ≥ %50
        let seviye = 'A2';
        for (let i = this.SEVIYELER.length - 1; i >= 0; i--) {
            const lv = this.SEVIYELER[i];
            const toplam = this.test.sorular.filter((s) => s.lv === lv).length || 1;
            if ((this.test.dogru[lv] / toplam) >= 0.5) { seviye = lv; break; }
        }
        try { localStorage.setItem(this.anahtar, seviye); } catch (e) {}
        this.seciliSeviye = seviye;
        this.seviyeGoster();
        const son = document.getElementById('kp-test-sonuc');
        son.classList.remove('hidden');
        son.innerHTML = `<h3>🎓 Seviyen: <b>${seviye}</b></h3>
            <p>A2 ${this.test.dogru['A2']}/3 · B1 ${this.test.dogru['B1']}/3 · B2 ${this.test.dogru['B2']}/3 · C1 ${this.test.dogru['C1']}/3</p>
            <p class="tip">Kartlar, Quiz ve Yazma modülleri bu seviyeye odaklanmanı sağlar.</p>
            <div class="yanlis-butonlar">
                <button class="btn btn-next" id="btn-kp-filtrele">🎴 Kartlarda ${seviye} çalış</button>
                <button class="btn btn-clear" id="btn-kp-test-vazgec2">✖️ Kapat</button>
            </div>`;
        document.getElementById('btn-kp-filtrele').addEventListener('click', () => this.seviyeyeCals(seviye));
        const kapat = document.getElementById('btn-kp-test-vazgec2');
        if (kapat) kapat.addEventListener('click', () => this.testVazgec());
    },

    testVazgec() {
        this.test = null;
        const t = document.getElementById('kp-test');
        if (t) t.classList.add('hidden');
    },

    seviyeyeCals(seviye) {
        if (typeof KartUygulamasi !== 'undefined') {
            KartUygulamasi.seciliSeviye = seviye;
            document.querySelectorAll('#seviye-filtre .chip').forEach((c) =>
                c.classList.toggle('active', c.dataset.value === seviye));
            KartUygulamasi.uydur();
        }
        this.testVazgec();
        const p = document.getElementById('kartlar');
        if (p) p.scrollIntoView({ behavior: 'smooth' });
    },

    /* ---------- GÜNLÜK PLAN ---------- */
    bugun() {
        const x = new Date();
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    },

    planCiz() {
        const el = document.getElementById('kp-plan');
        if (!el) return;
        const gun = this.bugun();
        let kayit = {};
        try { kayit = JSON.parse(localStorage.getItem(this.planEn + ':' + gun) || '{}'); } catch (e) { kayit = {}; }
        const st = (typeof AkilliTekrar !== 'undefined') ? AkilliTekrar.istatistik() : { vade: 0 };
        const vade = Math.min(st.vade, 15);
        const gorevler = [
            { id: 'tekrar', metin: `🔁 Tekrar: ${vade} kelime`, bolum: '#tekrar', hedef: vade },
            { id: 'yeni', metin: '🆕 Yeni kelime öğren: 10', bolum: '#kartlar', hedef: 10 },
            { id: 'cumle', metin: '🧩 Cümle kur: 3', bolum: '#cumleler', hedef: 3 },
            { id: 'quiz', metin: '📝 Mini quiz: 5', bolum: '#quiz', hedef: 5 }
        ];
        let biten = 0;
        gorevler.forEach((g) => { if (kayit[g.id]) biten++; });
        const yuzde = gorevler.length ? Math.round((biten / gorevler.length) * 100) : 0;
        const satirlar = gorevler.map((g) => {
            const yapildi = !!kayit[g.id];
            return `<button class="kp-gorev ${yapildi ? 'yapildi' : ''}" data-gorev="${g.id}">
                ${yapildi ? '✅' : '⬜'} ${g.metin}
            </button>`;
        }).join('');
        el.innerHTML = `<div class="kp-ilerleme"><div class="kp-ilerleme-dolgu" style="width:${yuzde}%"></div></div>
            <div class="kp-plan-bilgi">Bugünkü plan · ${biten}/${gorevler.length} tamamlandı (${yuzde}%)</div>
            ${satirlar}`;
        el.querySelectorAll('.kp-gorev').forEach((b) => {
            b.addEventListener('click', () => {
                const id = b.dataset.gorev;
                if (!kayit[id]) kayit[id] = true;
                try { localStorage.setItem(this.planEn + ':' + gun, JSON.stringify(kayit)); } catch (e) {}
                this.planCiz();
                const gorev = gorevler.find((g) => g.id === id);
                if (gorev) {
                    const hedef = document.querySelector(gorev.bolum);
                    if (hedef) hedef.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    },

    /* ---------- HAFTALIK RAPOR ---------- */
    raporCiz() {
        const el = document.getElementById('kp-rapor');
        if (!el) return;
        if (typeof AkilliTekrar === 'undefined') { el.textContent = '—'; return; }
        const st = AkilliTekrar.istatistik();
        const simdi = Date.now();
        const HAFTA = 7 * 24 * 60 * 60 * 1000;
        let haftaYeni = 0;
        for (const r of Object.values(AkilliTekrar.kayitlar)) {
            if (r.ilk && (simdi - r.ilk) < HAFTA && r.a > 0) haftaYeni++;
        }
        let haftaTekrar = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            haftaTekrar += AkilliTekrar.gunluk[k] || 0;
        }
        const seri = AkilliTekrar.seri();
        el.innerHTML =
            `<div class="kp-raporsatir">🔥 Tekrar serisi: <b>${seri} gün</b></div>
             <div class="kp-raporsatir">🆕 Bu hafta öğrenilen: <b>${haftaYeni}</b> yeni kelime</div>
             <div class="kp-raporsatir">🔁 Bu hafta tekrar: <b>${haftaTekrar}</b></div>
             <div class="kp-raporsatir">📚 Toplam öğrenilen: <b>${st.ogren}</b> · Zorlanan: ${st.zorlanan}</div>
             <p class="tip" style="margin-top:0.5rem;">Düzenli tekrar kalıcı öğrenmenin anahtarı — her gün Akıllı Tekrar'ı bitir. 🔥</p>`;
        this.grafikCiz();
    },

    // Son 7 günün tekrar aktivitesini basit CSS barlarıyla çizer
    grafikCiz() {
        const kutu = document.getElementById('kp-grafik');
        if (!kutu || typeof AkilliTekrar === 'undefined' || !AkilliTekrar.tarihG) return;
        const gunler = [];
        let enYuksek = 1;
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const k = AkilliTekrar.tarihG(d);
            const deger = AkilliTekrar.gunluk[k] || 0;
            if (deger > enYuksek) enYuksek = deger;
            gunler.push({ k, deger, gun: k.slice(8, 10) });
        }
        kutu.innerHTML = gunler.map((g) => {
            const yuk = Math.round((g.deger / enYuksek) * 100);
            const bugun = g.gun === String(new Date().getDate()).padStart(2, '0');
            return `<div class="kp-bar-kolon${bugun ? ' bugun' : ''}" title="${g.k}: ${g.deger} tekrar">
                        <div class="kp-bar-dolgu" style="height:${Math.max(4, yuk)}%"></div>
                        <span class="kp-bar-gun">${g.gun}</span>
                    </div>`;
        }).join('') + `<div class="kp-bar-etiket">Son 7 gün tekrar sayısı</div>`;
    },

    olaylariBagla() {
        const bagla = {
            'btn-kp-seviye-test': () => this.testBaslat(),
            'btn-kp-test-bitir': () => this.testIlerle(),
            'btn-kp-test-vazgec': () => this.testVazgec(),
            'btn-kp-test-ses': () => {
                const s = this.test ? this.test.sorular[this.test.sira] : null;
                if (s) ses.konus(s.k.w);
            }
        };
        for (const [id, fn] of Object.entries(bagla)) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        }
    }
};

/* ==================================================
   YAPAY ZEKÂ ÖĞRETMENİ (kural + istatistik tabanlı)
   - Yazılan cümleyi düzeltir, hataları Türkçe açıklar
   - Seviyeye göre mini ders soruları üretir
   - İsteğe bağlı: cümlenin Türkçesini getirir (Google)
   ================================================== */
const Ogretmen = {
    baslat() {
        this.olaylariBagla();
        this.duzeltileneGir();
    },

    /* ---------- KURAL MOTORU ---------- */
    NOTLAR: [],

    // Dilbilgisi kategorileri (mini ders için)
    GRAMER: {
        edat: {
            ad: 'Edat',
            kelimeler: ['to', 'in', 'at', 'on', 'for', 'with', 'from', 'about', 'into'],
            ipucu: (k) => k === 'at' ? '«at»: saat ve belirli nokta (at 8 o’clock)' :
                       k === 'on' ? '«on»: gün ve yüzey (on Monday)' :
                       k === 'in' ? '«in»: ay / mevsim / içerisi (in May, in the box)' :
                       k === 'to' ? '«to»: yön ve varış (go to school)' :
                       k === 'for' ? '«for»: süre ve amaç (for two hours)' :
                       k === 'with' ? '«with»: birlikte/lik (with my friends)' :
                       k === 'from' ? '«from»: çıkış noktası (from Turkey)' :
                       k === 'about' ? '«about»: hakkında' : '«into»: içine'
        },
        art: {
            ad: 'Artikel',
            kelimeler: ['a', 'an', 'the'],
            ipucu: (k) => k === 'the' ? '«the»: bilinen/belirli şeyde kullanılır' :
                       k === 'an' ? '«an»: ünlüyle başlayan kelimeden önce gelir' :
                       '«a»: ünsüzle başlayan kelimeden önce gelir'
        },
        bag: {
            ad: 'Bağlaç',
            kelimeler: ['because', 'but', 'so', 'and', 'although', 'if', 'when', 'while', 'or'],
            ipucu: (k) => ({ because: 'sebep (çünkü)', but: 'karşıtlık (ama)', so: 'sonuç (bu yüzden)',
                and: 'bağlama (ve)', although: '-e rağmen', if: 'koşul (eğer)', when: '-dığında',
                while: '-iken', or: 'veya' }[k] || 'cümlenin anlamına göre seç')
        },
        kip: {
            ad: 'Kip fiili',
            kelimeler: ['must', 'can', 'should', 'will', 'would', 'may', 'might', 'could'],
            ipucu: (k) => ({ must: 'zorunluluk', can: 'yapabilmek', should: 'tavsiye', will: 'gelecek',
                would: 'koşul / nazik istek', may: 'olasılık / izin', might: 'zayıf olasılık',
                could: 'geçmiş yetenek' }[k] || 'kip fiili')
        }
    },

    not(metin) {
        this.NOTLAR.push(metin);
    },

    // Verilen metindeki yaygın Türkçe-konuşan hatalarını düzelt
    duzelt(ham) {
        this.NOTLAR = [];
        let t = ham.trim();
        const orijinal = t;
        const EKLI = { go: 'goes', do: 'does', have: 'has', play: 'plays', like: 'likes', want: 'wants',
            need: 'needs', read: 'reads', work: 'works', study: 'studies', say: 'says', think: 'thinks',
            look: 'looks', eat: 'eats', drink: 'drinks', live: 'lives', come: 'comes', take: 'takes',
            give: 'gives', make: 'makes', get: 'gets', help: 'helps', know: 'knows', watch: 'watches',
            wash: 'washes', go_ing: null };
        const ING = { go: 'going', play: 'playing', read: 'reading', work: 'working', study: 'studying',
            eat: 'eating', write: 'writing', swim: 'swimming', run: 'running', talk: 'talking',
            listen: 'listening', watch: 'watching', sleep: 'sleeping', come: 'coming', take: 'taking',
            make: 'making', get: 'getting', help: 'helping', drive: 'driving', walk: 'walking', do: 'doing',
            have: 'having', buy: 'buying', see: 'seeing', meet: 'meeting' };

        const kurallar = [
            // 1) Kip + to hatası
            { re: /\b(must|can|could|should|will|would|may|might|shall)\s+to\s+(?=[a-z])/i,
              yap: (m) => { this.not(`Kip fiilinden (${m[1]}) sonra <b>to</b> gelmez; fiil yalın kalır (${m[1]} ${m[2] ?? 'fiil'}).`); return m[1] + ' ' + (m[2] || ''); } },
            // 2) want + to ekle
            { re: /\b(wants?|wanted)\s+(?!to\b|that\b|for\b|\w+ing\b)(go|play|read|work|study|eat|write|buy|see|meet|help|learn|travel|do|make|get|have|watch)\b/i,
              yap: (m) => { this.not(`<b>${m[1]}</b> ile ikinci fiil varsa araya <b>to</b> girer: ${m[1]} <b>to</b> ${m[2]}.`); return m[1] + ' to ' + m[2]; } },
            // 3) go + yer( prep eksiği )
            { re: /\bgo(es)?\s+(the|a|my|your|school|work|bed|cinema|bank|supermarket|hospital|market|park|city|village|university|office)\b/i,
              yap: (m) => { this.not(`Gidilen yerden önce <b>to</b> edatı kullanılır: ${m[1] ? 'goes' : 'go'} <b>to</b> ${m[2].toLowerCase()}.`); return 'goes to ' + m[2]; } },
            // 4) he/she/it + fiile -s
            { re: /\b(he|she|it)\s+(?!has\b|is\b|was\b|does\b|goes\b|plays\b|likes\b|wants\b|needs\b|reads\b|works\b|studies\b|says\b|thinks\b|looks\b|eats\b|drinks\b|lives\b|comes\b|takes\b|gives\b|makes\b|gets\b|helps\b|knows\b|watches\b)(go|have|do|play|like|want|need|read|work|study|say|think|look|eat|drink|live|come|take|give|make|get|help|know|watch)\b/i,
              yap: (m) => { const s = EKLI[m[2].toLowerCase()] || m[2].toLowerCase() + 's'; this.not(`Özne <b>${m[1]}</b> iken fiilin sonuna <b>-s/-es</b> eklenir: ${m[1]} <b>${s}</b>.`); return m[1] + ' ' + s; } },
            // 5) I is / I are / he are / we is...
            { re: /\bI\s+(is|are)\b/i, yap: () => { this.not('1. tekil şahıs <b>I</b> ile <b>am</b> kullanılır: I am.'); return 'I am'; } },
            { re: /\b(he|she|it)\s+are\b/i, yap: (m) => { this.not(`<b>${m[1]}</b> öznesiyle <b>is</b> kullanılır.`); return m[1] + ' is'; } },
            { re: /\b(you|we|they)\s+is\b/i, yap: (m) => { this.not(`<b>${m[1]}</b> öznesiyle <b>are</b> kullanılır.`); return m[1] + ' are'; } },
            // 6) şimdiki zaman: am/is/are + yalın fiil -> -ing
            { re: /\b(am|is|are)\s+(?!\w+ing\b|going\b|able\b|a\b|an\b|the\b|my\b|your\b|very\b|going\b|good\b|bad\b|happy\b|sad\b|tired\b)(go|play|read|work|study|eat|write|swim|run|talk|listen|watch|sleep|come|take|make|get|help|drive|walk|do|have|buy|see|meet)\b/i,
              yap: (m) => { const ing = ING[m[2].toLowerCase()] || m[2].toLowerCase() + 'ing'; this.not(`Şimdiki zaman: <b>${m[1]}</b> + fiil + <b>-ing</b> (${m[1]} ${ing}).`); return m[1] + ' ' + ing; } },
            // 7) enjoy + fiil -> -ing
            { re: /\benjoy(s|ed)?\s+(?!\w+ing\b)(go|play|read|work|study|eat|write|swim|run|talk|listen|watch|walk|drive|swim|read)\b/i,
              yap: (m) => { const ing = ING[m[2].toLowerCase()] || m[2].toLowerCase() + 'ing'; this.not(`<b>enjoy</b> sonrasında fiil +ing kullanılır: enjoy ${ing}.`); return 'enjoy' + (m[1] || '') + ' ' + ing; } },
            // 8) a/an
            { re: /\ba\s+([aeiouAEIOU]\w*)/, yap: () => { this.not('Ünlü ile başlayan isimden önce <b>an</b> kullanılır (an apple).'); return 'an'; } },
            { re: /\ban\s+([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]\w*)/, yap: () => { this.not('Ünsüz ile başlayan isimden önce <b>a</b> kullanılır (a book).'); return 'a'; } },
            // 8b) gereksiz copula: "I am agree" → "I agree"
            { re: /\b(am|is|are)\s+(agree|disagree|need|want|prefer|believe|know|understand)\b/i,
              yap: (m) => { this.not(`<b>${m[1]}</b> burada gereksiz: fiil zaten anlam taşır (I am agree → <b>I agree</b>).`); return m[2]; } },
            // 9) çifte olumsuzluk
            { re: /\b(don't have|doesn't have|haven't|hasn't|cannot|cant?t?)\s+(no|nothing|nobody)\b/i,
              yap: (m) => { const duz = m[2] === 'no' ? 'any' : m[2] === 'nothing' ? 'anything' : 'anybody'; this.not(`Çifte olumsuzluk yanlıştır: <b>${m[2]}</b> yerine <b>${duz}</b> kullanılır.`); return m[1] + ' ' + duz; } },
            // 10) büyük harf + i -> I
            { re: /\bi\s+(?=[a-z])/g, yap: () => { this.not('1. tekil şahıs zamiri her zaman <b>I</b> büyük yazılır.'); return 'I '; } }
        ];

        // kuralları sırayla uygula
        kurallar.forEach((k) => {
            if (k.re.global) t = t.replace(k.re, k.yap);
            else t = t.replace(k.re, k.yap);
        });

        // cümle başı büyük + son noktalama
        const basiBuyuk = t.charAt(0).toUpperCase() + t.slice(1);
        if (basiBuyuk !== t) { this.not('Cümleye büyük harfle başlanır.'); t = basiBuyuk; }
        if (!/[.!?]\s*$/.test(t)) { t = t.replace(/\s*$/, '') + '.'; this.not('Cümlenin sonuna nokta (veya ? / !) eklenir.'); }
        if (/goes to the? (home|here|there|back|away)\b/i.test(t)) { this.not('Not: <b>go home</b> gibi kalıplarda "to" kullanılmaz (istisna).'); }

        return { orijinal, duzeltilmis: t, notlar: this.NOTLAR.slice() };
    },

    duzeltileneGir() {
        document.querySelector('#og-cumle').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.duzeltUygula(); }
        });
    },

    duzeltUygula() {
        const girdi = document.getElementById('og-cumle').value || '';
        if (!girdi.trim()) return;
        const sonuc = this.duzelt(girdi);
        const kutu = document.getElementById('og-duzeltme-sonuc');
        let html = sonuc.notlar.length
            ? `<div class="og-duzeltilmis">📝 Düzeltilmiş: <b>"${sonuc.duzeltilmis}"</b></div>
               <div class="geri-baslik">📘 Hataların ve kurallar</div><ul class="geri-list">` +
              sonuc.notlar.map((n) => `<li>${n}</li>`).join('') + `</ul>`
            : `<div class="og-duzeltilmis iyi">🎉 Cümlen doğru görünüyor: <b>"${sonuc.duzeltilmis}"</b></div>`;
        // Çevir butonu
        html += `<div class="bagli-butonlar" style="margin-top:0.6rem;">
                    <button class="btn bgl" id="og-cevir">🌐 Türkçesini göster</button>
                    <button class="btn bgl bgl-ekle" id="og-duzelt-yeni">✍️ Yeni dene</button>
                </div>`;
        kutu.innerHTML = html;
        kutu.classList.remove('hidden');
        const cevirBtn = document.getElementById('og-cevir');
        if (cevirBtn) cevirBtn.addEventListener('click', () => this.cevirGoster(sonuc.duzeltilmis, cevirBtn));
        const yeni = document.getElementById('og-duzelt-yeni');
        if (yeni) yeni.addEventListener('click', () => {
            document.getElementById('og-cumle').value = '';
            kutu.classList.add('hidden');
            document.getElementById('og-cumle').focus();
        });
    },

    cevirGoster(metin, btn) {
        if (btn.dataset.durum) return;
        btn.textContent = 'Çevriliyor…';
        fetch('https://translate.google.com/translate_a/single?client=dict-chrome-ex&sl=en&tl=tr&dt=t&q=' +
              encodeURIComponent(metin))
            .then((r) => r.json())
            .then((don) => {
                const parcalar = (don[0] || []).map((b) => b && b[0]).filter(Boolean);
                const kutu = document.getElementById('og-ceviri');
                if (kutu) { kutu.textContent = '🇹🇷 ' + parcalar.join(''); kutu.classList.remove('hidden'); }
                btn.textContent = '🌐 Türkçesi gösterildi';
                btn.dataset.durum = '1';
            })
            .catch(() => { btn.textContent = '🌐 Çevrilemedi (ağ/ağ güvenlik)'; });
    },

    /* ---------- SEVİYEYE GÖRE MİNİ DERS ---------- */
    zorlukSeviyesi() {
        let seviye = 'A2';
        try { seviye = localStorage.getItem('englearn-seviye') || 'A2'; } catch (e) {}
        return { A2: 1, B1: 1, B2: 2, C1: 3 }[seviye] || 1;
    },

    soruUret() {
        if (typeof CUMLER === 'undefined' || !CUMLER.length) return this.kelimeSoru();
        // 1) Dilbilgisi klozü (edat/artikel/bağlaç/kip) — birkaç deneme
        for (let d = 0; d < 8; d++) {
            const q = this.fonksiyonelSoru();
            if (q) return q;
        }
        // 2) Hata bulma (yanlış şık arasından doğru cümle)
        const h = this.hataSoru();
        if (h) return h;
        // 3) Son çare: kelime → anlam
        return this.kelimeSoru();
    },

    // Dilbilgisi klozü: cümlede boş bırakılan edat/artikel/bağlaç/kip
    fonksiyonelSoru() {
        const z = this.zorlukSeviyesi();
        const havuz = CUMLER.filter((c) => c.en && (!c.zorluk || c.zorluk <= z + 0.5));
        if (!havuz.length) return null;
        const c = havuz[Math.floor(Math.random() * havuz.length)];
        const kelitok = c.en.split(/\s+/);
        let idx = -1, katAdi = null;
        for (const [ad, veri] of Object.entries(this.GRAMER)) {
            for (let i = 1; i < kelitok.length - 1; i++) {
                const kel = kelitok[i].toLowerCase().replace(/[^a-z']/g, '');
                if (veri.kelimeler.includes(kel)) { idx = i; katAdi = ad; break; }
            }
            if (idx !== -1) break;
        }
        if (idx === -1) return null;
        const dogruKel = kelitok[idx].replace(/[^a-z']/g, '');
        const templ = kelitok.slice();
        templ[idx] = '_____';
        const secenekler = [dogruKel];
        for (const d of this.GRAMER[katAdi].kelimeler) {
            if (d !== dogruKel && secenekler.length < 4) secenekler.push(d);
        }
        this.karistir(secenekler);
        return {
            tip: this.GRAMER[katAdi].ad, cumle: templ.join(' '), turkce: c.tr || '',
            dogru: dogruKel, secenekler,
            aciklama: `Doğru: <b>${dogruKel}</b> — ${this.GRAMER[katAdi].ipucu ? this.GRAMER[katAdi].ipucu(dogruKel) : ''}.`
        };
    },

    // Hata bulma: yanlış şıklar arasından doğru cümleyi seç
    hataSoru() {
        const z = this.zorlukSeviyesi();
        const havuz = CUMLER.filter((c) => c.en && (!c.zorluk || c.zorluk <= z + 0.5));
        if (!havuz.length) return null;
        const c = havuz[Math.floor(Math.random() * havuz.length)];
        const kelitok = c.en.split(/\s+/);
        let idx = -1, katAdi = null;
        for (const [ad, veri] of Object.entries(this.GRAMER)) {
            for (let i = 1; i < kelitok.length - 1; i++) {
                const kel = kelitok[i].toLowerCase().replace(/[^a-z']/g, '');
                if (veri.kelimeler.includes(kel)) { idx = i; katAdi = ad; break; }
            }
            if (idx !== -1) break;
        }
        if (idx === -1) return null;
        const dogruKel = kelitok[idx].replace(/[^a-z']/g, '');
        const secenekler = [c.en];
        for (const d of this.GRAMER[katAdi].kelimeler) {
            if (d === dogruKel) continue;
            if (secenekler.length >= 4) break;
            const kopya = kelitok.slice();
            kopya[idx] = d;
            secenekler.push(kopya.join(' '));
        }
        this.karistir(secenekler);
        return {
            tip: `${this.GRAMER[katAdi].ad} · Hata bul`, cumle: 'Cümlelerden hangisi doğru?',
            turkce: c.tr || '', dogru: c.en, secenekler,
            aciklama: `Doğru: <b>"${c.en}"</b> — ${this.GRAMER[katAdi].ipucu ? this.GRAMER[katAdi].ipucu(dogruKel) : ''}.`
        };
    },

    karistir(dizi) {
        for (let i = dizi.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dizi[i], dizi[j]] = [dizi[j], dizi[i]];
        }
    },

    kelimeSoru() {
        // KELIMELER'den seviyeye uygun devrik şık sorusu (kelime→anlam)
        const z = this.zorlukSeviyesi();
        const lvMap = { 1: ['A2', 'B1'], 2: ['B1', 'B2'], 3: ['B2', 'C1'] };
        const seckin = KELIMELER.filter((k) => k.tr && lvMap[z].includes(k.lv));
        const kelime = seckin[Math.floor(Math.random() * seckin.length)] || KELIMELER.find((k) => k.tr);
        const secenekler = [kelime.tr];
        const diger = KELIMELER.filter((k) => k.tr && k.tr !== kelime.tr).slice(0, 300);
        while (secenekler.length < 4 && diger.length) {
            const i = Math.floor(Math.random() * diger.length);
            const d = diger.splice(i, 1)[0];
            if (!secenekler.includes(d.tr)) secenekler.push(d.tr);
        }
        for (let i = secenekler.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [secenekler[i], secenekler[j]] = [secenekler[j], secenekler[i]];
        }
        return {
            tip: 'Kelime → anlam', cumle: kelime.w, turkce: '',
            dogru: kelime.tr, secenekler,
            aciklama: `Doğrusu: <b>${kelime.w}</b> = ${kelime.tr}.`
        };
    },

    soruGoster() {
        const q = this.soruUret();
        if (!q) { SiteKoruma.toast('Soru üretilemedi.'); return; }
        this.suankiSoru = q;
        document.getElementById('og-soru-tip').textContent = q.tip;
        document.getElementById('og-soru-cumle').innerHTML = q.cumle.replace(/_____/g, '<b>_____</b>');
        const ipucu = document.getElementById('og-soru-ipucu');
        if (q.turkce) { ipucu.textContent = '🇹🇷 ' + q.turkce; ipucu.classList.remove('hidden'); }
        else ipucu.classList.add('hidden');
        const kutu = document.getElementById('og-secenekler');
        kutu.innerHTML = '';
        q.secenekler.forEach((sec) => {
            const b = document.createElement('button');
            b.className = 'quiz-option og-secenek';
            b.textContent = sec;
            b.addEventListener('click', () => this.soruCevap(b, sec));
            kutu.appendChild(b);
        });
        document.getElementById('og-geri').classList.add('hidden');
        this.soruCevapli = false;
    },

    soruCevap(buton, secilen) {
        if (this.soruCevapli) return;
        this.soruCevapli = true;
        const q = this.suankiSoru;
        const g = document.getElementById('og-geri');
        g.classList.remove('hidden');
        if (secilen === q.dogru) {
            this.dogru++;
            g.className = 'feedback dogru';
            g.innerHTML = `🎉 Doğru! ${q.aciklama}`;
            buton.classList.add('dogru-secim');
        } else {
            this.yanlis++;
            buton.classList.add('yanlis-secim');
            document.querySelectorAll('#og-secenekler .og-secenek').forEach((o) => {
                if (o.textContent === q.dogru) o.classList.add('dogru-secim');
            });
            g.className = 'feedback yanlis';
            g.innerHTML = `😅 Olmadı. ${q.aciklama}${this.soruIpuclari(secilen)}`;
        }
        document.getElementById('og-skor').textContent = `${this.dogru} ✓ · ${this.yanlis} ✗`;
        document.getElementById('btn-og-sonraki').disabled = false;
    },

    soruIpuclari(kelime) {
        return `<div class="geri-baslik">📘 Küçük ipucu</div><ul class="geri-list"><li>"${kelime}" seçtin; cümledeki anlamına dikkat et — kelimeyi sözlükte açıp bağlamı gör.</li></ul>`;
    },

    olaylariBagla() {
        const bag = {
            'btn-og-duzelt': () => this.duzeltUygula(),
            'btn-og-soru': () => { this.soruGoster(); document.getElementById('btn-og-sonraki').disabled = false; },
            'btn-og-sonraki': () => { this.soruGoster(); document.getElementById('btn-og-sonraki').disabled = true; }
        };
        for (const [id, fn] of Object.entries(bag)) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        }
        const sesBtn = document.getElementById('btn-og-ses');
        if (sesBtn) sesBtn.addEventListener('click', () => {
            if (this.suankiSoru && typeof ses !== 'undefined') ses.konus(this.suankiSoru.cumle.replace(/_____/g, 'blank'));
        });
        // başta doğru/yanlış sayaçları
        this.dogru = 0;
        this.yanlis = 0;
    }
};

/* ==================================================
   DÜZENSİZ FİİLLER — liste + elle yazma pratiği
   ================================================== */
const DuzensizFiillerUygulamasi = {
    tum: [],
    suan: null,          // {fiil, form:'v2'|'v3', cevap}
    cevapli: false,
    dogru: 0,
    yanlis: 0,

    baslat() {
        if (typeof DUZENSIZ_FIILLER === 'undefined' || !DUZENSIZ_FIILLER.length) return;
        this.tum = DUZENSIZ_FIILLER.slice();
        this.listeCiz(this.tum);
        this.olaylariBagla();
        this.soruUret();
    },

    listeCiz(dizi) {
        const el = document.getElementById('df-liste');
        if (!el) return;
        el.innerHTML = '';
        dizi.forEach((f) => {
            const row = document.createElement('div');
            row.className = 'df-satir';
            const v3Farkli = f.v3 !== f.v2;
            row.innerHTML = `<span class="df-v1">${f.v1}</span>` +
                `<span class="df-ok">→</span><span class="df-v2">${f.v2}</span>` +
                (v3Farkli ? `<span class="df-ok">→</span><span class="df-v3">${f.v3}</span>` : '') +
                `<span class="df-tr">${f.tr}</span>` +
                `<button class="sound-btn small df-ses" title="Dinle">🔊</button>`;
            row.querySelector('.df-ses').addEventListener('click', () => ses.konus(`${f.v1}, ${f.v2}, ${f.v3}`));
            el.appendChild(row);
        });
    },

    filtre(q) {
        q = (q || '').toLowerCase().trim();
        if (!q) { this.listeCiz(this.tum); return; }
        this.listeCiz(this.tum.filter((f) => f.v1.toLowerCase().includes(q) || f.tr.toLowerCase().includes(q)));
    },

    soruUret() {
        const f = this.tum[Math.floor(Math.random() * this.tum.length)];
        const form = Math.random() < 0.5 ? 'v2' : 'v3';
        this.suan = { fiil: f, form, cevap: f[form] };
        this.cevapli = false;
        document.getElementById('df-soru').textContent = f.v1;
        document.getElementById('df-ipucu').textContent = (form === 'v2' ? 'V2 — geçmiş zaman hâli' : 'V3 — past participle hâli') + ` (${f.tr})`;
        const geri = document.getElementById('df-geri');
        geri.classList.add('hidden');
        const giris = document.getElementById('df-girdi');
        giris.value = '';
        giris.disabled = false;
        giris.focus();
        document.getElementById('btn-df-kontrol').disabled = false;
        document.getElementById('btn-df-sonraki').disabled = true;
        this.skorGuncelle();
    },

    kontrol() {
        if (this.cevapli || !this.suan) return;
        const giris = document.getElementById('df-girdi');
        const yaz = giris.value.trim().toLowerCase();
        if (!yaz) return;
        this.cevapli = true;
        const kabuller = this.suan.cevap.toLowerCase().split('/').map((s) => s.trim());
        const ok = kabuller.includes(yaz);
        const geri = document.getElementById('df-geri');
        geri.classList.remove('hidden');
        if (ok) {
            this.dogru++;
            geri.className = 'quiz-feedback dogru';
            geri.innerHTML = `🎉 Doğru! <b>${this.suan.fiil.v1} → ${this.suan.cevap}</b>`;
        } else {
            this.yanlis++;
            geri.className = 'quiz-feedback yanlis';
            geri.innerHTML = `😅 Yanlış. Doğrusu: <b>${this.suan.fiil.v1} → ${this.suan.cevap}</b>`;
            if (typeof YanlisKaydedici !== 'undefined') {
                YanlisKaydedici.kaydet({
                    id: 'fiil|' + this.suan.fiil.v1 + '|' + this.suan.form,
                    tip: 'fiil',
                    kelime: `${this.suan.fiil.v1} (${this.suan.form.toUpperCase()})`,
                    verdi: yaz,
                    dogru: this.suan.cevap
                });
            }
        }
        giris.disabled = true;
        document.getElementById('btn-df-kontrol').disabled = true;
        document.getElementById('btn-df-sonraki').disabled = false;
        this.skorGuncelle();
    },

    skorGuncelle() {
        const d = document.getElementById('df-dogru');
        const y = document.getElementById('df-yanlis');
        if (d) d.textContent = this.dogru;
        if (y) y.textContent = this.yanlis;
    },

    olaylariBagla() {
        const k = document.getElementById('btn-df-kontrol');
        const s = document.getElementById('btn-df-sonraki');
        const sesBtn = document.getElementById('btn-df-ses');
        const giris = document.getElementById('df-girdi');
        const ara = document.getElementById('df-ara');
        if (k) k.addEventListener('click', () => this.kontrol());
        if (s) s.addEventListener('click', () => this.soruUret());
        if (sesBtn) sesBtn.addEventListener('click', () => { if (this.suan) ses.konus(this.suan.fiil.v1); });
        if (giris) giris.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.cevapli ? this.soruUret() : this.kontrol(); }
        });
        if (ara) ara.addEventListener('input', (e) => this.filtre(e.target.value));
    }
};

const YanlislarUygulamasi = {
    oturum: null,
    seciliTip: null,   // null = tümü
    oturumSes: null,   // tekrar oturumunda okunacak İngilizce metin

    // Üstteki kare kategori kutucukları için ikon + ad
    TIP_META: {
        kart:    { ad: 'Kartlar',    ikon: '🎴' },
        fiil:    { ad: 'Düzensiz Fiil', ikon: '🔤' },
        quiz:    { ad: 'Quiz',       ikon: '📝' },
        yazma:   { ad: 'Yazma',      ikon: '✍️' },
        meaning: { ad: 'Meaning',    ikon: '🎯' },
        es:      { ad: 'Eş Anlamlı', ikon: '🔄' },
        zi:      { ad: 'Zıt Anlamlı', ikon: '⚖️' },
        cumle:   { ad: 'Cümle',      ikon: '🧩' },
        kosu:    { ad: 'Koşu',       ikon: '🏃' },
        sozluk:  { ad: 'Sözlük',     ikon: '📖' },
        phrasal: { ad: 'Phrasal',    ikon: '🔗' },
        deyim:   { ad: 'Deyimler',   ikon: '🗨️' }
    },

    baslat() {
        YanlisKaydedici.yukle();
        this.olaylariBagla();
        this.ciz();
        this.rozetGuncelle();
    },

    olaylariBagla() {
        document.getElementById('btn-yanlis-temizle').addEventListener('click', () => {
            if (confirm('Tüm yanlış kayıtları silinsin mi?')) {
                YanlisKaydedici.temizle();
                this.ciz();
                this.rozetGuncelle();
            }
        });
        document.getElementById('btn-yanlis-tekrar').addEventListener('click', () => this.tekrarKur());
        document.getElementById('btn-yanlis-bitti-yeniden').addEventListener('click', () => {
            this.oturum = null;
            this.ciz();
        });
        document.getElementById('btn-yanlis-kart-sonraki').addEventListener('click', () => this.oturumSonraki());
        document.getElementById('btn-yanlis-kart-ses').addEventListener('click', () => {
            const k = this.oturum ? this.oturum.kayitlar[this.oturum.sira] : null;
            if (k) ses.konus(this.oturumSes || k.kelime || k.dogru);
        });
    },

    tipAd(tip) {
        const m = this.TIP_META[tip];
        return m ? m.ad : (tip || '?');
    },

    ciz() {
        YanlisKaydedici.yukle();
        const tum = YanlisKaydedici.liste;

        // Üstteki kare kategori kutucukları
        this.kategorileriCiz(tum);

        const liste = this.seciliTip ? tum.filter((k) => k.tip === this.seciliTip) : tum;

        const bilgi = document.getElementById('yanlis-bilgi');
        if (tum.length === 0) {
            bilgi.textContent = 'Henüz yanlış yok. Bir modülde yanlış yapınca burada listelenir.';
        } else if (this.seciliTip) {
            bilgi.textContent = `${this.tipAd(this.seciliTip)}: ${liste.length} yanlış — tekrar ederek geç!`;
        } else {
            bilgi.textContent = `${tum.length} yanlış kayıtlı — tekrar ederek üstesinden gel!`;
        }
        document.getElementById('btn-yanlis-tekrar').disabled = liste.length === 0;

        const kutu = document.getElementById('yanlis-liste');
        kutu.innerHTML = '';
        document.getElementById('yanlis-oturum').classList.add('hidden');
        kutu.classList.remove('hidden');

        if (liste.length === 0) {
            kutu.innerHTML = '<p class="tip">🎉 Temiz! Yanlışların burada birikecek.</p>';
            return;
        }
        liste.forEach((k) => {
            const satir = document.createElement('div');
            satir.className = 'yanlis-satir';
            satir.innerHTML = `
                <span class="yanlis-tip">${this.tipAd(k.tip)}</span>
                <div class="yanlis-govde">
                    <div class="yanlis-soru">${k.kelime || ''}</div>
                    <div class="yanlis-dogru">✅ ${k.dogru || ''}</div>
                </div>
                <button class="sound-btn small" title="Dinle">🔊</button>
                <button class="yanlis-sil" title="Sil">🗑️</button>`;
            satir.querySelector('.sound-btn').addEventListener('click', (ev) => {
                ev.stopPropagation();
                ses.konus(k.kelime || k.dogru);
            });
            satir.querySelector('.yanlis-sil').addEventListener('click', (ev) => {
                ev.stopPropagation();
                YanlisKaydedici.sil(k.id);
                this.ciz();
                this.rozetGuncelle();
            });
            kutu.appendChild(satir);
        });
    },

    /* Kullanıcının yanlış yaptığı kategorileri kare kutucuklar olarak çizer */
    kategorileriCiz(tum) {
        const kutu = document.getElementById('yanlis-kategoriler');
        if (!kutu) return;
        kutu.innerHTML = '';

        const sayilar = {};
        tum.forEach((k) => { const t = k.tip || 'diger'; sayilar[t] = (sayilar[t] || 0) + 1; });

        // Seçili kategori artık yoksa "Tümü"ne dön
        if (this.seciliTip && !sayilar[this.seciliTip]) this.seciliTip = null;

        if (tum.length === 0) { kutu.classList.add('hidden'); return; }
        kutu.classList.remove('hidden');

        // "Tümü" kutucuğu
        kutu.appendChild(this.kategoriKutusu('__tum', '📚', 'Tümü', tum.length));

        Object.keys(sayilar).forEach((t) => {
            const m = this.TIP_META[t] || { ad: t, ikon: '•' };
            kutu.appendChild(this.kategoriKutusu(t, m.ikon, m.ad, sayilar[t]));
        });

        // Kullanım ipucu
        const ipucu = document.createElement('p');
        ipucu.className = 'yanlis-kategori-ipucu';
        ipucu.textContent = '👆 Bir kategoriye dokun → yanlışlarını hemen çözmeye başla';
        kutu.appendChild(ipucu);
    },

    kategoriKutusu(tip, ikon, ad, sayi) {
        const btn = document.createElement('button');
        btn.type = 'button';
        const aktif = (tip === '__tum') ? !this.seciliTip : (this.seciliTip === tip);
        btn.className = 'yanlis-kategori' + (aktif ? ' aktif' : '');
        btn.title = 'Yanlışlarını hemen çöz';
        btn.innerHTML =
            `<span class="yk-ikon">${ikon}</span>` +
            `<span class="yk-ad">${ad}</span>` +
            `<span class="yk-sayi">${sayi}</span>`;
        // Kutuya tıklar tıklamaz o kategorinin tekrar oturumu başlar
        btn.addEventListener('click', () => {
            this.seciliTip = (tip === '__tum') ? null : tip;
            this.oturum = null;
            this.ciz();
            this.tekrarKur();
        });
        return btn;
    },

    tekrarKur() {
        YanlisKaydedici.yukle();
        const taban = this.seciliTip
            ? YanlisKaydedici.liste.filter((k) => k.tip === this.seciliTip)
            : YanlisKaydedici.liste;
        const kayitlar = taban.slice().sort(() => Math.random() - 0.5);
        if (kayitlar.length === 0) return;
        this.oturum = { sira: 0, kayitlar };
        document.getElementById('yanlis-liste').classList.add('hidden');
        const kat = document.getElementById('yanlis-kategoriler');
        if (kat) kat.classList.add('hidden');
        document.getElementById('yanlis-oturum').classList.remove('hidden');
        this.kartGoster();
    },

    kartGoster() {
        const k = this.oturum.kayitlar[this.oturum.sira];
        if (!k) { this.oturumBitti(); return; }

        document.getElementById('yanlis-ilerleme').textContent =
            `${this.oturum.sira + 1} / ${this.oturum.kayitlar.length}`;
        document.getElementById('yanlis-kart-tip').textContent = this.tipAd(k.tip);

        const geri = document.getElementById('yanlis-kart-geri');
        geri.classList.add('hidden');
        geri.className = 'quiz-feedback hidden';

        const sonraki = document.getElementById('btn-yanlis-kart-sonraki');
        sonraki.disabled = true;
        sonraki.classList.remove('hidden');

        const kutu = document.getElementById('yanlis-kart-secenekler');
        kutu.className = 'quiz-options';
        kutu.innerHTML = '';

        document.getElementById('btn-yanlis-kart-ses').classList.remove('hidden');

        this.oturumSes = k.kelime || k.dogru;

        // Yanlışı, yapıldığı modülün biçiminde tekrar göster
        switch (k.tip) {
            case 'kart':    this.kartTipi_kart(k); break;
            case 'yazma':   this.kartTipi_yazma(k); break;
            case 'cumle':   this.kartTipi_cumle(k); break;
            case 'meaning': this.kartTipi_secmeli(k, 'def'); break;
            case 'es':      this.kartTipi_secmeli(k, 'es'); break;
            case 'zi':      this.kartTipi_secmeli(k, 'zi'); break;
            case 'deyim':   this.kartTipi_secmeli(k, 'deyim'); break;
            default:        this.kartTipi_secmeli(k, 'tr'); break; // quiz, koşu, sözlük...
        }
    },

    /* --- Kartlar: kelime kartı (çevir → Biliyorum / Bilmiyorum) --- */
    kartTipi_kart(k) {
        const w = (typeof KELIMELER !== 'undefined' ? KELIMELER.find((x) => x.w === k.kelime) : null) || {};
        document.getElementById('yanlis-kart-kelime').textContent = '';
        document.getElementById('btn-yanlis-kart-ses').classList.add('hidden');
        document.getElementById('btn-yanlis-kart-sonraki').classList.add('hidden');

        const kutu = document.getElementById('yanlis-kart-secenekler');
        kutu.className = '';
        kutu.innerHTML = `
            <div class="flashcard yanlis-flash" id="yanlis-flash">
                <div class="card-inner">
                    <div class="card-face card-front">
                        <span class="level-badge">${w.lv || ''}</span>
                        <div class="word">${k.kelime || ''}</div>
                        <div class="pron">${w.pr || ''}</div>
                        <div class="hint">👆 Çevirmek için tıkla</div>
                    </div>
                    <div class="card-face card-back">
                        <span class="level-badge">${w.lv || ''}</span>
                        <div class="word-tr">${k.dogru || ''}</div>
                        ${w.ex ? `<div class="example">${w.ex}</div>` : ''}
                    </div>
                </div>
            </div>
            <div class="yanlis-aksiyon">
                <button class="btn btn-known" id="yanlis-biliyorum">😀 Biliyorum (kaldır)</button>
                <button class="btn btn-unknown" id="yanlis-bilmiyorum">😕 Bilmiyorum</button>
            </div>`;

        const flash = kutu.querySelector('#yanlis-flash');
        flash.addEventListener('click', () => flash.classList.toggle('flipped'));
        kutu.querySelector('#yanlis-biliyorum').addEventListener('click', () => {
            YanlisKaydedici.sil(k.id);
            this.rozetGuncelle();
            this.oturumSonraki();
        });
        kutu.querySelector('#yanlis-bilmiyorum').addEventListener('click', () => this.oturumSonraki());
    },

    /* --- Yazma: Türkçe anlam → İngilizcesini yaz --- */
    kartTipi_yazma(k) {
        document.getElementById('yanlis-kart-kelime').textContent = k.dogru || '';
        this.oturumSes = k.kelime || k.dogru;

        const kutu = document.getElementById('yanlis-kart-secenekler');
        kutu.className = '';
        kutu.innerHTML = `
            <div class="yanlis-yaz-area">
                <input type="text" id="yanlis-yaz-input" class="yanlis-yaz-input"
                       placeholder="İngilizcesini yaz..." autocomplete="off"
                       autocapitalize="off" autocorrect="off" spellcheck="false">
            </div>
            <div class="yanlis-aksiyon">
                <button class="btn btn-check" id="yanlis-yaz-kontrol">✔️ Kontrol</button>
            </div>`;

        const input = kutu.querySelector('#yanlis-yaz-input');
        const kontrolEt = () => {
            const girilen = (input.value || '').trim().toLowerCase().replace(/\s+/g, ' ');
            if (!girilen) { input.focus(); return; }
            const geri = document.getElementById('yanlis-kart-geri');
            if (girilen === (k.kelime || '').trim().toLowerCase()) {
                geri.className = 'quiz-feedback dogru';
                geri.textContent = '🎉 Doğru! Bu yanlış artık geçildi.';
                YanlisKaydedici.sil(k.id);
                this.rozetGuncelle();
            } else {
                geri.className = 'quiz-feedback yanlis';
                geri.textContent = `😅 Yanlış. Doğrusu: "${k.kelime}". Listede kaldı.`;
            }
            geri.classList.remove('hidden');
            input.disabled = true;
            document.getElementById('btn-yanlis-kart-sonraki').disabled = false;
        };
        kutu.querySelector('#yanlis-yaz-kontrol').addEventListener('click', kontrolEt);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') kontrolEt(); });
        setTimeout(() => input.focus(), 60);
    },

    /* --- Cümle: Türkçe cümleyi İngilizce kelimelerle kur --- */
    kartTipi_cumle(k) {
        document.getElementById('yanlis-kart-kelime').textContent = k.kelime || '';
        this.oturumSes = k.dogru || '';

        const dogruKelimeler = (k.dogru || '').split(' ').filter(Boolean);
        const karisik = dogruKelimeler.map((w) => w).sort(() => Math.random() - 0.5);

        const kutu = document.getElementById('yanlis-kart-secenekler');
        kutu.className = '';
        kutu.innerHTML = `
            <div class="yanlis-cumle-cevap" id="yanlis-cumle-cevap"></div>
            <div class="yanlis-cumle-havuz" id="yanlis-cumle-havuz"></div>
            <div class="yanlis-aksiyon">
                <button class="btn btn-check" id="yanlis-cumle-kontrol">✔️ Kontrol</button>
            </div>`;

        const cevap = kutu.querySelector('#yanlis-cumle-cevap');
        const havuz = kutu.querySelector('#yanlis-cumle-havuz');
        const secilenler = [];

        karisik.forEach((w) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'yanlis-token';
            b.textContent = w;
            b.addEventListener('click', () => {
                if (b.disabled) return;
                b.disabled = true;
                b.classList.add('kullanildi');
                const c = document.createElement('button');
                c.type = 'button';
                c.className = 'yanlis-token-cevap';
                c.textContent = w;
                c.addEventListener('click', () => {
                    c.remove();
                    b.disabled = false;
                    b.classList.remove('kullanildi');
                    const idx = secilenler.indexOf(w);
                    if (idx >= 0) secilenler.splice(idx, 1);
                });
                secilenler.push(w);
                cevap.appendChild(c);
            });
            havuz.appendChild(b);
        });

        kutu.querySelector('#yanlis-cumle-kontrol').addEventListener('click', () => {
            const geri = document.getElementById('yanlis-kart-geri');
            const kullanici = secilenler.join(' ').trim();
            if (kullanici === (k.dogru || '').trim()) {
                geri.className = 'quiz-feedback dogru';
                geri.textContent = '🎉 Doğru! Bu yanlış artık geçildi.';
                YanlisKaydedici.sil(k.id);
                this.rozetGuncelle();
            } else {
                geri.className = 'quiz-feedback yanlis';
                geri.textContent = `😅 Yanlış. Doğrusu: "${k.dogru}". Listede kaldı.`;
            }
            geri.classList.remove('hidden');
            document.getElementById('btn-yanlis-kart-sonraki').disabled = false;
        });
    },

    /* --- Çoktan seçmeli (quiz / meaning / eş / zıt / koşu) --- */
    kartTipi_secmeli(k, mod) {
        document.getElementById('yanlis-kart-kelime').textContent = k.kelime || '';
        this.oturumSes = k.kelime || k.dogru;

        let havuz = [];
        if (mod === 'def' && typeof DEFINITIONS !== 'undefined') havuz = DEFINITIONS.map((d) => d.def);
        else if (mod === 'es' && typeof ES_ANLAMLILAR !== 'undefined') havuz = ES_ANLAMLILAR.map((c) => c.dogru);
        else if (mod === 'zi' && typeof ZIT_ANLAMLILAR !== 'undefined') havuz = ZIT_ANLAMLILAR.map((c) => c.dogru);
        else if (mod === 'deyim' && typeof DEYIMLER !== 'undefined') havuz = DEYIMLER.map((d) => d.tr);
        else if (typeof KELIMELER !== 'undefined') havuz = KELIMELER.map((x) => x.tr);

        const dogru = k.dogru;
        const kaynak = havuz.filter((x) => x && x !== dogru);
        const celdiriciler = [];
        while (celdiriciler.length < 3 && kaynak.length > 0) {
            const i = Math.floor(Math.random() * kaynak.length);
            const v = kaynak.splice(i, 1)[0];
            if (!celdiriciler.includes(v)) celdiriciler.push(v);
        }
        const secenekler = [dogru, ...celdiriciler].sort(() => Math.random() - 0.5);

        const kutu = document.getElementById('yanlis-kart-secenekler');
        kutu.className = 'quiz-options';
        kutu.innerHTML = '';
        secenekler.forEach((cevap) => {
            const buton = document.createElement('button');
            buton.className = 'quiz-option';
            buton.textContent = cevap;
            buton.addEventListener('click', () => this.kartTikla(buton, cevap, k));
            kutu.appendChild(buton);
        });
    },

    kartTikla(buton, secilen, k) {
        const geri = document.getElementById('yanlis-kart-geri');
        const tum = Array.from(document.querySelectorAll('#yanlis-kart-secenekler .quiz-option'));
        if (secilen === k.dogru) {
            buton.classList.add('dogru-secim');
            geri.className = 'quiz-feedback dogru';
            geri.textContent = '🎉 Doğru! Bu yanlış artık geçildi.';
            YanlisKaydedici.sil(k.id);   // doğru bildi → listeden düş
            this.rozetGuncelle();
        } else {
            buton.classList.add('yanlis-secim');
            tum.forEach((o) => { if (o.textContent === k.dogru) o.classList.add('dogru-secim'); });
            geri.className = 'quiz-feedback yanlis';
            geri.textContent = `😅 Tekrar yanlış: doğrusu "${k.dogru}". Listede kaldı.`;
        }
        geri.classList.remove('hidden');
        document.getElementById('btn-yanlis-kart-sonraki').disabled = false;
        tum.forEach((b) => b.disabled = true);
    },

    oturumSonraki() {
        if (this.oturum.sira < this.oturum.kayitlar.length - 1) {
            this.oturum.sira++;
            this.kartGoster();
        } else {
            this.oturumBitti();
        }
    },

    oturumBitti() {
        YanlisKaydedici.yukle();
        const kalan = YanlisKaydedici.liste.length;
        const mesaj = kalan === 0
            ? '🏆 Harika! Tüm yanlışlarını geçtin!'
            : `💪 Oturum bitti. ${kalan} yanlış hâlâ listede — birazdan tekrar dene.`;
        document.getElementById('yanlis-bilgi').textContent = mesaj;
        this.oturum = null;
        this.ciz();
        this.rozetGuncelle();
    },

    rozetGuncelle() {
        YanlisKaydedici.yukle();
        const rozet = document.getElementById('yanlis-rozet');
        if (!rozet) return;
        const sayi = YanlisKaydedici.liste.length;
        if (sayi > 0) {
            rozet.textContent = sayi;
            rozet.classList.remove('hidden');
        } else {
            rozet.classList.add('hidden');
        }
    }
};
