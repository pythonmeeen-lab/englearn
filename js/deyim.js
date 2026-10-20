/* ==================================================
   DEYİMLER & ATASÖZLERİ
   Kaynak: DEYIMLER (KELIMELER'den ayrı bir dizi).
   Bu kalıplarda seviye (A2/B1…) ve kategori yoktur;
   kartlar kelime kartlarıyla aynı yapıyı kullanır.
   ================================================== */
const DeyimUygulamasi = {
    tur: 'deyim',
    liste: [],
    indeks: 0,
    bilinen: new Set(),
    tekrar: new Set(),
    kayitAnahtari: 'englearn-deyim-bilinen',

    kaydet() {
        try {
            localStorage.setItem(this.kayitAnahtari, JSON.stringify({
                bilinen: [...this.bilinen],
                tekrar: [...this.tekrar]
            }));
        } catch (e) { /* localStorage kapalıysa sessizce geç */ }
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

    havuz() {
        const kaynak = typeof DEYIMLER !== 'undefined' ? DEYIMLER : [];
        return kaynak.filter((d) => d.tur === this.tur);
    },

    turSec(tur) {
        if (tur !== 'deyim' && tur !== 'atasozu') return;
        this.tur = tur;
        document.querySelectorAll('#deyim-tur-filtre .chip').forEach((c) => {
            c.classList.toggle('active', c.dataset.tur === tur);
        });
        this.liste = this.havuz();
        this.indeks = 0;
        this.kartGoster();
        this.istatistikGuncelle();
    },

    baslat() {
        this.yukle();
        this.liste = this.havuz();
        this.kartGoster();
        this.istatistikGuncelle();

        const kart = document.getElementById('deyim-flashcard');
        if (kart) kart.addEventListener('click', () => kart.classList.toggle('flipped'));

        document.querySelectorAll('#deyim-tur-filtre .chip').forEach((chip) => {
            chip.addEventListener('click', () => this.turSec(chip.dataset.tur));
        });

        document.getElementById('btn-deyim-ses').addEventListener('click', (e) => {
            e.stopPropagation();
            const k = this.liste[this.indeks];
            if (k) ses.konus(k.w);
        });
        document.getElementById('btn-deyim-ses-cumle').addEventListener('click', (e) => {
            e.stopPropagation();
            const k = this.liste[this.indeks];
            if (k && k.ex) ses.konus(k.ex);
        });

        document.getElementById('btn-deyim-geri').addEventListener('click', () => this.geri());
        document.getElementById('btn-deyim-ileri').addEventListener('click', () => this.ileri());
        document.getElementById('btn-deyim-karistir').addEventListener('click', () => this.karistir());
        document.getElementById('btn-deyim-biliyorum').addEventListener('click', () => this.isaretle(true));
        document.getElementById('btn-deyim-bilmiyorum').addEventListener('click', () => this.isaretle(false));
        document.getElementById('btn-deyim-sifirla').addEventListener('click', () => {
            if (confirm('Deyim/atasözü ilerlemeniz silinecek. Emin misiniz?')) {
                this.bilinen.clear();
                this.tekrar.clear();
                localStorage.removeItem(this.kayitAnahtari);
                this.istatistikGuncelle();
            }
        });
    },

    kartGoster() {
        const kart = document.getElementById('deyim-flashcard');
        if (kart) {
            const inner = kart.querySelector('.card-inner');
            if (inner) inner.style.transition = 'none';   // arka yüz görünmesin
            kart.classList.remove('flipped');
            if (inner) { void kart.offsetWidth; inner.style.transition = ''; }
        }

        const yazi = (id, metin) => {
            const el = document.getElementById(id);
            if (el) el.textContent = metin;
        };

        if (this.liste.length === 0) {
            yazi('deyim-kelime', 'Sonuç yok');
            yazi('deyim-anlam', 'Bu türde kayıt bulunamadı');
            yazi('deyim-ornek', '');
            yazi('deyim-ornek-tr', '');
            yazi('deyim-sayac', '0 / 0');
            yazi('deyim-tur-rozet', this.tur);
            const dolgu = document.getElementById('deyim-progress-dolgu');
            if (dolgu) dolgu.style.width = '0%';
            return;
        }

        const k = this.liste[Math.min(this.indeks, this.liste.length - 1)];
        yazi('deyim-kelime', k.w);
        yazi('deyim-anlam', k.tr);
        yazi('deyim-ornek', k.ex || '');
        yazi('deyim-ornek-tr', k.exTr || '');
        yazi('deyim-tur-rozet', this.tur === 'deyim' ? 'deyim' : 'atasözü');

        const toplam = this.liste.length;
        const sira = this.indeks + 1;
        yazi('deyim-sayac', sira + ' / ' + toplam);
        const dolgu = document.getElementById('deyim-progress-dolgu');
        if (dolgu) dolgu.style.width = ((sira / toplam) * 100) + '%';
    },

    geri() {
        if (this.indeks > 0) { this.indeks--; this.kartGoster(); }
    },

    ileri() {
        if (this.indeks < this.liste.length - 1) {
            this.indeks++;
            this.kartGoster();
        }
    },

    karistir() {
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
        const id = 'deyim|' + k.w;

        if (biliyorMu) {
            this.bilinen.add(k.w);
            this.tekrar.delete(k.w);
            if (typeof YanlisKaydedici !== 'undefined') {
                YanlisKaydedici.sil(id);
                if (typeof YanlislarUygulamasi !== 'undefined') YanlislarUygulamasi.rozetGuncelle();
            }
        } else {
            this.tekrar.add(k.w);
            this.bilinen.delete(k.w);
            if (typeof YanlisKaydedici !== 'undefined') {
                YanlisKaydedici.kaydet({
                    id: id, tip: 'deyim', kelime: k.w, verdi: '', dogru: k.tr
                });
            }
        }
        this.kaydet();
        this.istatistikGuncelle();
        this.ileri();
    },

    istatistikGuncelle() {
        const yazi = (id, metin) => {
            const el = document.getElementById(id);
            if (el) el.textContent = metin;
        };
        yazi('deyim-stat-toplam', this.havuz().length);
        yazi('deyim-stat-bilinen', this.bilinen.size);
        yazi('deyim-stat-tekrar', this.tekrar.size);
    }
};
