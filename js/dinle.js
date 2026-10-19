// ==================================================
// EngLearn — DİNLEME MODU
// Kelimeyi dinle, anlamını seç. Seviye filtresi destekli.
// ==================================================
const DinlemeUygulamasi = {
    seciliSeviye: 'all',
    sorular: [],
    sira: 0,
    dogru: 0,
    toplam: 10,

    baslat() {
        this.filtreHazirla();
        this.olaylariBagla();
        this.yeniTur();
    },

    havuz() {
        if (typeof KELIMELER === 'undefined') return [];
        return KELIMELER.filter((k) => k && k.w && k.tr &&
            (this.seciliSeviye === 'all' || k.lv === this.seciliSeviye));
    },

    filtreHazirla() {
        const kapsam = document.getElementById('dinleme-seviye-filtre');
        if (!kapsam) return;
        kapsam.addEventListener('click', (e) => {
            const c = e.target.closest('.chip');
            if (!c) return;
            kapsam.querySelectorAll('.chip').forEach((x) => x.classList.remove('aktif'));
            c.classList.add('aktif');
            this.seciliSeviye = c.dataset.dlv;
            this.yeniTur();
        });
    },

    olaylariBagla() {
        const sonraki = document.getElementById('btn-dinleme-sonraki');
        if (sonraki) sonraki.addEventListener('click', () => this.sonrakiSoru());

        const yeniden = document.getElementById('btn-dinleme-yeniden');
        if (yeniden) yeniden.addEventListener('click', () => this.yeniTur());

        const ses = document.getElementById('btn-dinleme-ses');
        if (ses) ses.addEventListener('click', () => this.kelimeyiOku());
    },

    yeniTur() {
        const havuz = this.havuz();
        if (havuz.length < 4) {
            const el = document.getElementById('dinleme-secenekler');
            if (el) el.innerHTML = '<p class="tip">Bu seviyede yeterli kelime yok.</p>';
            return;
        }
        const karisik = [...havuz].sort(() => Math.random() - 0.5);
        this.sorular = karisik.slice(0, Math.min(this.toplam, karisik.length));
        this.sira = 0;
        this.dogru = 0;
        this.soruGoster();
    },

    kelimeyiOku() {
        const k = this.sorular[this.sira];
        if (!k || typeof ses === 'undefined') return;
        // önce kelime, kısa bir duraklamadan sonra örnek cümle
        ses.konus(k.w);
        if (k.ex) setTimeout(() => ses.konus(k.ex), 900);
    },

    soruGoster() {
        const k = this.sorular[this.sira];
        if (!k) return;
        document.getElementById('dinleme-ilerleme').textContent =
            'Soru ' + (this.sira + 1) + ' / ' + this.sorular.length;
        document.getElementById('dinleme-dogru').textContent = this.dogru;
        const roz = document.getElementById('dinleme-seviye-rozet');
        if (roz) roz.textContent = k.lv || '';
        const geri = document.getElementById('dinleme-geri');
        if (geri) { geri.classList.add('hidden'); geri.innerHTML = ''; }
        document.getElementById('btn-dinleme-sonraki').disabled = true;

        // 3 çeldirici anlam
        const havuz = this.havuz();
        const yanlis = havuz.filter((x) => x.w !== k.w && x.tr);
        const sec = [k.tr].concat(yanlis.slice(0, 3).map((x) => x.tr));
        const uniq = sec.filter((v, i, a) => v && a.indexOf(v) === i).sort(() => Math.random() - 0.5);

        const opts = document.getElementById('dinleme-secenekler');
        opts.innerHTML = uniq.map((t) =>
            '<button class="quiz-option" data-tr="' + encodeURIComponent(t) + '">' + t + '</button>'
        ).join('');
        opts.addEventListener('click', (e) => {
            const b = e.target.closest('.quiz-option');
            if (b) this.cevapla(b, k);
        });

        // Ses OTOMATIK çalmaz; yalnızca 🔊 butonuyla dinlenir (sayfa açılışında
        // ses çalması istem dışı olduğu için kaldırıldı).
        const sesEl = document.getElementById('btn-dinleme-ses');
        if (sesEl) sesEl.classList.add('dikkat');
    },

    cevapla(buton, k) {
        const secilen = decodeURIComponent(buton.dataset.tr || '');
        const geri = document.getElementById('dinleme-geri');
        if (secilen === k.tr) {
            buton.classList.add('dogru-secim');
            this.dogru++;
            geri.innerHTML = '✅ Doğru! <b>' + k.w + '</b> = ' + k.tr;
            if (typeof ses !== 'undefined') ses.konus(k.ex || k.w);
        } else {
            buton.classList.add('yanlis-secim');
            geri.innerHTML = '❌ Dinlediğin: <b>' + k.w + '</b> = ' + k.tr;
        }
        geri.classList.remove('hidden');
        document.getElementById('dinleme-dogru').textContent = this.dogru;
        document.getElementById('btn-dinleme-sonraki').disabled = false;
    },

    sonrakiSoru() {
        this.sira++;
        if (this.sira >= this.sorular.length) {
            const opts = document.getElementById('dinleme-secenekler');
            if (opts) opts.innerHTML = '';
            document.getElementById('dinleme-ilerleme').textContent = '🏁 Bitti!';
            const geri = document.getElementById('dinleme-geri');
            geri.innerHTML = 'Dinleme sonucu: <b>' + this.dogru + ' / ' + this.sorular.length +
                '</b> doğru. 🔊 butonuna basıp tekrar deneyebilirsin.';
            geri.classList.remove('hidden');
            document.getElementById('btn-dinleme-sonraki').disabled = true;
            this.sorular = [];
            return;
        }
        this.soruGoster();
    }
};

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof DinlemeUygulamasi !== 'undefined') DinlemeUygulamasi.baslat();
    });
}
