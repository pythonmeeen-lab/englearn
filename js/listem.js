// ==================================================
// EngLearn — LİSTEM (Favoriler)
// Kartlarda ⭐ ile topla, tek bakışta tekrar + mini çalışma
// ==================================================
const FavorilerUygulamasi = {
    anahtar: 'englearn-favoriler',
    liste: [],
    oturum: null,

    baslat() {
        this.yukle();
        this.olaylariBagla();
        this.ciz();
        this.rozet();
    },
    yukle() {
        try { this.liste = JSON.parse(localStorage.getItem(this.anahtar) || '[]') || []; }
        catch (e) { this.liste = []; }
    },
    kaydet() { try { localStorage.setItem(this.anahtar, JSON.stringify(this.liste)); } catch (e) {} },
    icinde(w) { return this.liste.some((x) => x.w === w); },

    cekCevir(k) {
        const i = this.liste.findIndex((x) => x.w === k.w);
        if (i >= 0) this.liste.splice(i, 1);
        else this.liste.unshift({ w: k.w, tr: k.tr, lv: k.lv, ct: k.ct, pr: k.pr });
        this.kaydet(); this.ciz(); this.rozet();
    },
    kartButon(k) {
        const b = document.getElementById('btn-favori');
        if (!b) return;
        const on = k && this.icinde(k.w);
        b.textContent = on ? '⭐' : '☆';
        b.title = on ? 'Listemden çıkar' : 'Listeme ekle';
        b.classList.toggle('aktif', !!on);
    },
    rozet() {
        const r = document.getElementById('fav-rozet');
        if (!r) return;
        if (this.liste.length) { r.textContent = this.liste.length; r.classList.remove('hidden'); }
        else r.classList.add('hidden');
    },

    ciz() {
        const liste = document.getElementById('listem-liste');
        const bos = document.getElementById('listem-bos');
        const btn = document.getElementById('btn-listem-calis');
        if (bos) bos.classList.toggle('hidden', this.liste.length > 0);
        if (btn) btn.disabled = this.liste.length === 0;
        if (!liste) return;
        if (!this.liste.length) { liste.innerHTML = ''; return; }
        liste.innerHTML = this.liste.map((k, i) =>
            `<div class="listem-satir" data-i="${i}">
                <span class="listem-kelime">${k.w} <em>${k.pr || ''}</em></span>
                <span class="listem-anlam">${k.tr || ''} <span class="tip">${k.lv || ''}</span></span>
                <span class="listem-aks">
                    <button class="btn bgl bgl-kucuk" data-eylem="ses" title="Dinle">🔊</button>
                    <button class="btn bgl bgl-kucuk btn-danger" data-eylem="sil" title="Sil">✖</button>
                </span>
            </div>`).join('');
    },

    olaylariBagla() {
        const kapsam = document.getElementById('listem-kapsam');
        if (kapsam) kapsam.addEventListener('click', (e) => {
            const satir = e.target.closest('.listem-satir');
            if (!satir) return;
            const k = this.liste[+satir.dataset.i];
            if (!k) return;
            if (e.target.closest('[data-eylem="ses"]')) { if (typeof ses !== 'undefined') ses.konus(k.w); }
            else if (e.target.closest('[data-eylem="sil"]')) {
                this.liste.splice(+satir.dataset.i, 1);
                this.kaydet(); this.ciz(); this.rozet();
            }
        });

        const basla = document.getElementById('btn-listem-calis');
        if (basla) basla.addEventListener('click', () => this.calismaBaslat());

        const cik = document.getElementById('btn-listem-cik');
        if (cik) cik.addEventListener('click', () => this.calismaBitir());

        const sonraki = document.getElementById('btn-listem-sonraki');
        if (sonraki) sonraki.addEventListener('click', () => this.sonrakiSoru());

        const sesBtn = document.getElementById('btn-listem-ses');
        if (sesBtn) sesBtn.addEventListener('click', () => {
            const s = this.oturum ? this.oturum.kayitlar[this.oturum.sira] : null;
            if (s && typeof ses !== 'undefined') ses.konus(s.w);
        });

        const temizle = document.getElementById('btn-listem-temizle');
        if (temizle) temizle.addEventListener('click', () => {
            if (confirm('Listedeki tüm kelimeler silinsin mi?')) {
                this.liste = [];
                this.kaydet(); this.ciz(); this.rozet(); this.calismaBitir();
            }
        });
    },

    calismaBaslat() {
        if (!this.liste.length) return;
        const karisik = [...this.liste].sort(() => Math.random() - 0.5);
        this.oturum = { kayitlar: karisik, sira: 0, dogru: 0 };
        const kutu = document.getElementById('listem-calisma');
        const liste = document.getElementById('listem-liste');
        if (kutu) kutu.classList.remove('hidden');
        if (liste) liste.classList.add('hidden');
        this.soruGoster();
    },
    calismaBitir() {
        const kutu = document.getElementById('listem-calisma');
        const liste = document.getElementById('listem-liste');
        if (kutu) kutu.classList.add('hidden');
        if (liste) liste.classList.remove('hidden');
        this.oturum = null;
    },
    soruGoster() {
        if (!this.oturum) return;
        const kay = this.oturum.kayitlar, sira = this.oturum.sira;
        if (sira >= kay.length) { this.sonucGoster(); return; }
        const k = kay[sira];
        document.getElementById('listem-ilerleme').textContent = (sira + 1) + ' / ' + kay.length;
        document.getElementById('listem-kelime').textContent = k.w;
        const havuz = [...this.liste];
        for (const ok of kay) if (!havuz.some((x) => x.w === ok.w)) havuz.push(ok);
        const yanlis = havuz.filter((x) => x.w !== k.w && x.tr);
        let sec = [k.tr].concat(yanlis.slice(0, 3).map((x) => x.tr));
        sec = sec.filter((v, i, a) => v && a.indexOf(v) === i).sort(() => Math.random() - 0.5);
        const opts = document.getElementById('listem-secenekler');
        opts.innerHTML = sec.map((t) => '<button class="quiz-option" data-tr="' + encodeURIComponent(t) + '">' + t + '</button>').join('');
        opts.querySelectorAll('.quiz-option').forEach((b) => b.addEventListener('click', () => this.cevapla(b, k)));
        const geri = document.getElementById('listem-geri');
        if (geri) { geri.classList.add('hidden'); geri.innerHTML = ''; }
        document.getElementById('btn-listem-sonraki').disabled = true;
    },

    cevapla(buton, k) {
        if (!this.oturum) return;
        const secilen = decodeURIComponent(buton.dataset.tr || '');
        const geri = document.getElementById('listem-geri');
        const dogru = secilen === k.tr;
        if (dogru) {
            buton.classList.add('dogru-secim');
            this.oturum.dogru++;
            geri.innerHTML = '✅ Doğru! <b>' + k.w + '</b> = ' + k.tr;
        } else {
            buton.classList.add('yanlis-secim');
            geri.innerHTML = '❌ Doğrusu: <b>' + k.tr + '</b>';
        }
        geri.classList.remove('hidden');
        this.oturum.kayitlar[this.oturum.sira]._cevap = dogru;
        document.getElementById('btn-listem-sonraki').disabled = false;
    },
    sonrakiSoru() {
        if (!this.oturum) return;
        this.oturum.sira++;
        this.soruGoster();
    },
    sonucGoster() {
        const toplam = this.oturum.kayitlar.length;
        const dogru = this.oturum.dogru;
        const geri = document.getElementById('listem-geri');
        const opts = document.getElementById('listem-secenekler');
        if (opts) opts.innerHTML = '';
        document.getElementById('listem-kelime').textContent = '🏁 Bitti!';
        geri.innerHTML = 'Listenden <b>' + dogru + ' / ' + toplam + '</b> doğru bildin.';
        geri.classList.remove('hidden');
        document.getElementById('listem-ilerleme').textContent = toplam + ' / ' + toplam;
        document.getElementById('btn-listem-sonraki').disabled = true;
        this.oturum = null;
    }
};

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof FavorilerUygulamasi !== 'undefined') FavorilerUygulamasi.baslat();
    });
}
