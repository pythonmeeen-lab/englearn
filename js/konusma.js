// ==================================================
// EngLearn — 🎙️ KONUŞMA PRATİĞİ
// Web Speech API (mikrofon + tanıma) ile telaffuz pratiği.
// Modlar: kelime / cümle / dinle&söyle. Puan: Levenshtein benzerliği.
// Tarayıcı desteklemiyorsa zarif uyarı verir.
// ==================================================
const KonusmaUygulamasi = {
    mod: 'kelime',            // kelime | cumle | dinle
    dil: 'en-US',
    sorular: [],
    sira: 0,
    toplamPuan: 0,
    tc: 0,
    kayitAnah: 'englearn-konusma-en-iyi',
    enIyi: 0,

    baslat() {
        this.dil = localStorage.getItem('englearn-konusma-dil') || 'en-US';
        const dl = document.getElementById('konusma-dil');
        if (dl) dl.value = this.dil;
        try { this.enIyi = +(localStorage.getItem(this.kayitAnah) || 0); } catch (e) {}
        this.olaylariBagla();
        this.yeniTur();
        this.destekUyarisi();
    },

    destekUyarisi() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const u = document.getElementById('konusma-uyari');
        if (!u) return;
        if (!SR) {
            u.textContent = '⚠️ Bu tarayıcı ses tanımayı desteklemiyor (Chrome/Edge/Android' +
                ' önerilir; iOS Safari'de çalışmaz). Yine de "Dinlet" ile doğrusunu dinleyebilirsin.';
        } else {
            u.textContent = '🎯 Son oturum en iyi: %' + this.enIyi;
        }
    },

    // ---------- yardımcılar ----------
    temiz(s) {
        return String(s || '').toLowerCase()
            .replace(/[.,!?;:'"()\/\-]/g, ' ')
            .replace(/\s+/g, ' ').trim();
    },

    lev(a, b) {
        a = this.temiz(a); b = this.temiz(b);
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        const d = [];
        for (let i = 0; i <= b.length; i++) d[i] = [i];
        for (let j = 0; j <= a.length; j++) d[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                const c = a[j - 1] === b[i - 1] ? 0 : 1;
                d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
            }
        }
        return d[b.length][a.length];
    },

    puan(hedef, soylendi) {
        const uzunluk = Math.max(hedef.length, soylendi.length) || 1;
        const fark = Math.min(this.lev(hedef, soylendi), uzunluk);
        return Math.max(0, Math.round(100 - (fark / uzunluk) * 100));
    },


    // ---------- sorular ----------
    havuz() {
        if (typeof KELIMELER === 'undefined') return [];
        return KELIMELER.filter((k) => k && k.w && k.tr);
    },
    yeniTur() {
        const havuz = this.havuz();
        if (!havuz.length) return;
        const karisik = [...havuz].sort(() => Math.random() - 0.5).slice(0, 10);
        this.sorular = karisik;
        this.sira = 0; this.toplamPuan = 0; this.tc = 0;
        this.soruGoster();
    },
    soruGoster() {
        const k = this.sorular[this.sira];
        if (!k) { this.oturumBitti(); return; }
        document.getElementById('konusma-tab').textContent = 'Soru ' + (this.sira + 1) + ' / ' + this.sorular.length;
        document.getElementById('konusma-skor').textContent = '%' + (this.tc ? Math.round(this.toplamPuan / this.tc) : 0);
        document.getElementById('konusma-seviye').textContent = k.lv || '';
        const ydrm = document.getElementById('konusma-yardim');
        if (this.mod === 'kelime') {
            document.getElementById('konusma-gorev').textContent = k.w;
            ydrm.textContent = 'İngilizce kelimeyi ✍️ SÖYLE';
        } else if (this.mod === 'cumle') {
            document.getElementById('konusma-gorev').textContent = '🇹🇷 ' + (k.tr || '');
            ydrm.textContent = 'Bu cümleyi İngilizce söyle (doğrusu: "' + ((k.ex || '').trim()) + '")';
        } else {
            document.getElementById('konusma-gorev').textContent = k.ex || k.w;
            ydrm.textContent = 'Sesi dinle, sonra cümleyi tekrar söyle';
            if (typeof ses !== 'undefined') { try { ses.konus(k.ex || k.w); } catch (e) {} }
        }
        const geri = document.getElementById('konusma-geri');
        geri.classList.add('hidden'); geri.innerHTML = '';
        document.getElementById('btn-konusma-sonraki').disabled = true;
        this.durumGizle();
    },
    oturumBitti() {
        const ort = this.tc ? Math.round(this.toplamPuan / this.tc) : 0;
        if (ort > this.enIyi) { this.enIyi = ort; try { localStorage.setItem(this.kayitAnah, String(ort)); } catch (e) {} }
        document.getElementById('konusma-gorev').textContent = '🏁 Bitti!';
        document.getElementById('konusma-yardim').textContent = 'Ortalama %' + ort + ' — en iyi: %' + this.enIyi;
        const geri = document.getElementById('konusma-geri');
        geri.innerHTML = 'Ortalama telaffuz başarın <b>%' + ort + '</b>. ' + (
            ort >= 85 ? 'Harikasın! 🌟' : ort >= 60 ? 'İyi gidiyorsun, devam! 💪' : 'Pratikle düzelir, pes etme! 🎯');
        geri.classList.remove('hidden');
        this.sorular = [];
        this.durumGizle();
        this.destekUyarisi();
    },
    durumGizle() { const d = document.getElementById('konusma-durum'); if (d) d.classList.add('hidden'); },

    // ---------- tanıma ----------
    tanimaYeni() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return null;
        const r = new SR();
        r.lang = this.dil;
        r.interimResults = false;
        r.maxAlternatives = 3;
        return r;
    },
    konus() {
        const k = this.sorular[this.sira];
        if (!k) return;
        const r = this.tanimaYeni();
        if (!r) { alert('Bu tarayıcı ses tanımayı desteklemiyor.'); return; }
        const durum = document.getElementById('konusma-durum');
        const hedef = (this.mod === 'kelime') ? k.w : (k.ex || k.w);
        const ben = this;
        r.onresult = (e) => {
            const secim = [];
            const res0 = e.results[0];
            for (let i = 0; i < res0.length; i++) secim.push(res0[i].transcript);
            durum.classList.add('hidden');
            ben.degerlendir((secim[0] || ''), hedef, secim);
        };
        r.onerror = (e) => {
            durum.classList.add('hidden');
            const hata = e.error || '';
            if (hata === 'not-allowed' || hata === 'service-not-allowed') ben.bildir('Mikrofon izni yok — tarayıcı adres çubuğundan mikrofona izin ver.');
            else if (hata === 'no-speech') ben.bildir('Ses algılanmadı. 🎤 butonuna basıp tekrar söyle.');
            else ben.bildir('Tanıma hatası: ' + hata);
        };
        r.onend = () => { if (window.__konusmaR) window.__konusmaR = null; };
        window.__konusmaR = r;
        durum.classList.remove('hidden');
        durum.textContent = 'Dinleniyor… söyle!';
        try { r.start(); } catch (e) {}
    },


    // ---------- puanlama ----------
    degerlendir(soylendi, hedef, secimler) {
        const puan = this.puan(hedef, soylendi);
        this.toplamPuan += puan; this.tc++;
        document.getElementById('konusma-skor').textContent = '%' + Math.round(this.toplamPuan / this.tc);
        const geri = document.getElementById('konusma-geri');
        geri.innerHTML = '<b>%' + puan + '</b> telaffuz — söyledin: "' + (soylendi || '—') + '"<br>' +
            '<span class="tip">Doğrusu: "' + hedef + '"</span>';
        geri.classList.remove('hidden');
        document.getElementById('btn-konusma-sonraki').disabled = false;
    },
    bildir(msj) {
        const geri = document.getElementById('konusma-geri');
        geri.innerHTML = msj;
        geri.classList.remove('hidden');
        document.getElementById('btn-konusma-sonraki').disabled = false;
    },
    sonraki() {
        this.sira++;
        if (this.sira < this.sorular.length) this.soruGoster();
        else this.oturumBitti();
    },
    olaylariBagla() {
        const bag = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
        bag('btn-konusma-konus', () => this.konus());
        bag('btn-konusma-sonraki', () => this.sonraki());
        bag('btn-konusma-yeniden', () => this.yeniTur());
        bag('btn-konusma-dinlet', () => {
            const k = this.sorular[this.sira];
            if (k && typeof ses !== 'undefined') ses.konus(this.mod === 'kelime' ? k.w : (k.ex || k.w));
        });
        const mod = document.getElementById('konusma-mod-filtre');
        if (mod) mod.addEventListener('click', (e) => {
            const c = e.target.closest('.chip'); if (!c) return;
            mod.querySelectorAll('.chip').forEach((x) => x.classList.remove('aktif'));
            c.classList.add('aktif');
            this.mod = c.dataset.kmod;
            this.yeniTur();
        });
        const dl = document.getElementById('konusma-dil');
        if (dl) dl.addEventListener('change', () => {
            this.dil = dl.value;
            try { localStorage.setItem('englearn-konusma-dil', dl.value); } catch (e) {}
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof KonusmaUygulamasi !== 'undefined') KonusmaUygulamasi.baslat();
});
