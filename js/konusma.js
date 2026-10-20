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
