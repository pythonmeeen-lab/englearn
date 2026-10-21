// ==================================================
// EngLearn — "-to" alan Phrasal Verbs (eksik olanlar)
// Sözlükte zaten varsa tekrar eklenmez.
// ==================================================
(function () {
    var LISTE = [
        { w: 'get used to',   tr: 'alışmak',                    lv: 'B1' },
        { w: 'be used to',    tr: 'alışkın olmak',              lv: 'B1' },
        { w: 'live up to',    tr: 'beklentiyi karşılamak',      lv: 'B2' },
        { w: 'stand up to',   tr: 'karşı koymak / karşı durmak',lv: 'B1' },
        { w: 'put down to',   tr: 'bir şeye bağlamak / yormak', lv: 'B2' },
        { w: 'own up to',     tr: 'itiraf etmek',               lv: 'B2' },
        { w: 'get up to',     tr: 'bir iş çevirmek / yapmak',   lv: 'C1' },
        { w: 'come up to',    tr: 'bir düzeye ulaşmak',         lv: 'B2' },
        { w: 'get down to',   tr: 'işe koyulmak',               lv: 'B1' },
        { w: 'stick to',      tr: 'bir şeye bağlı kalmak',      lv: 'B1' },
        { w: 'object to',     tr: 'itiraz etmek',               lv: 'B1' },
        { w: 'adapt to',      tr: 'uyum sağlamak',              lv: 'B1' },
        { w: 'amount to',     tr: 'anlamına gelmek / toplamda etmek', lv: 'B2' },
        { w: 'cater to',      tr: 'ihtiyaca hizmet etmek',      lv: 'B2' },
        { w: 'conform to',    tr: 'uymak',                      lv: 'B2' },
        { w: 'resort to',     tr: 'başvurmak',                  lv: 'B1' },
        { w: 'consent to',    tr: 'razı olmak',                 lv: 'B2' },
        { w: 'apply to',      tr: 'başvurmak / uymak',          lv: 'B1' },
        { w: 'admit to',      tr: 'kabul etmek',                lv: 'B1' },
        { w: 'confess to',    tr: 'itiraf etmek',               lv: 'B1' },
        { w: 'prefer to',     tr: 'tercih etmek',               lv: 'A2' },
        { w: 'devote to',     tr: 'kendini adamak',             lv: 'B2' },
        { w: 'dedicate to',   tr: 'ithaf etmek / adamak',       lv: 'B2' },
        { w: 'tend to',       tr: 'eğiliminde olmak',           lv: 'B1' }
    ];
    if (typeof KELIMELER === 'undefined') return;
    var varolan = {};
    for (var i = 0; i < KELIMELER.length; i++) {
        if (KELIMELER[i] && KELIMELER[i].w) varolan[KELIMELER[i].w.toLowerCase()] = 1;
    }
    var eklenen = 0;
    LISTE.forEach(function (e) {
        if (varolan[e.w.toLowerCase()]) return;
        varolan[e.w.toLowerCase()] = 1;
        KELIMELER.push({ w: e.w, tr: e.tr, lv: e.lv, ct: 'PHRASAL', pr: '', ex: '', exTr: '' });
        eklenen++;
    });
    if (typeof window !== 'undefined') window.__PHRASAL_TO_EKLENEN = eklenen;
})();
