// ==================================================
// EngLearn — AI Asistan (canlı yapay zekâ sohbeti)
// Netlify Function (/.netlify/functions/ai) üzerinden Gemini'ye bağlanır.
// Fonksiyon hazır değilse zarif biçimde devre dışı kalır.
// ==================================================
const AIAsistan = {
    ucdoldu: '/.netlify/functions/ai',
    gecmis: [],           // {rol, metin}
    hazir: null,          // null = bilinmiyor, true/false

    baslat() {
        const girdi = document.getElementById('ai-girdi');
        const btn = document.getElementById('btn-ai-gonder');
        if (!girdi || !btn) return;
        btn.addEventListener('click', () => this.gonder());
        girdi.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.gonder(); }
        });
    },

    mesajEkle(rol, metin) {
        const kutu = document.getElementById('ai-sohbet');
        if (!kutu) return null;
        const el = document.createElement('div');
        el.className = 'ai-mesaj ' + (rol === 'sen' ? 'ai-sen' : 'ai-bot');
        el.textContent = metin;
        kutu.appendChild(el);
        kutu.scrollTop = kutu.scrollHeight;
        return el;
    },

    async gonder() {
        const girdi = document.getElementById('ai-girdi');
        const durum = document.getElementById('ai-durum');
        const btn = document.getElementById('btn-ai-gonder');
        const metin = (girdi.value || '').trim();
        if (!metin) return;

        this.mesajEkle('sen', metin);
        this.gecmis.push({ rol: 'user', metin });
        girdi.value = '';
        if (durum) durum.classList.remove('hidden');
        if (btn) btn.disabled = true;

        try {
            const yanit = await fetch(this.ucdoldu, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mesaj: metin, gecmis: this.gecmis.slice(-8) })
            });
            if (!yanit.ok) throw new Error('http ' + yanit.status);
            const veri = await yanit.json();
            const cevap = veri.cevap || '(boş yanıt)';
            this.gecmis.push({ rol: 'model', metin: cevap });
            this.mesajEkle('bot', cevap);
            this.hazir = true;
        } catch (e) {
            this.hazir = false;
            this.mesajEkle('bot',
                '⚠️ Yapay zekâ şu an bağlı değil. (Sunucu fonksiyonu / GEMINI_API_KEY tanımlı değil.) ' +
                'Yukarıdaki kural tabanlı "Cümle Düzeltme" hâlâ çalışıyor.');
        } finally {
            if (durum) durum.classList.add('hidden');
            if (btn) btn.disabled = false;
        }
    }
};

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof AIAsistan !== 'undefined') AIAsistan.baslat();
    });
}
