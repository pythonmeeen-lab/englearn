// ==================================================
// EngLearn — Ekstra Sözlük Kelimeleri
// Sözlükte zaten olan kelime atlanır.
// ==================================================
(function () {
    var LISTE = [
        { w: 'investigation', tr: 'araştırma / soruşturma / inceleme', lv: 'B1', ct: 'isimler' }
    ];
    if (typeof KELIMELER === 'undefined') return;
    var varolan = {};
    for (var i = 0; i < KELIMELER.length; i++) {
        if (KELIMELER[i] && KELIMELER[i].w) varolan[KELIMELER[i].w.toLowerCase()] = 1;
    }
    LISTE.forEach(function (e) {
        if (varolan[e.w.toLowerCase()]) return;
        varolan[e.w.toLowerCase()] = 1;
        KELIMELER.push({ w: e.w, tr: e.tr, lv: e.lv, ct: e.ct, pr: '', ex: '', exTr: '' });
    });
})();
