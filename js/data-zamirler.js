// ==================================================
// EngLearn — İngilizce Zamirler (cinsiyet belirtilmiş)
// Türkçede "o/onu" cinsiyetsiz; İngilizcede he/she/it ayrımı var.
// Sözlükte zaten olan kelime atlanır.
// ==================================================
(function () {
    var LISTE = [
        { w: 'he',       tr: 'o (erkek)',                    lv: 'A1' },
        { w: 'it',       tr: 'o (cansız/nesne)',             lv: 'A1' },
        { w: 'him',      tr: 'onu / ona (erkek)',            lv: 'A1' },
        { w: 'his',      tr: 'onun / onunki (erkek)',        lv: 'A1' },
        { w: 'hers',     tr: 'onunki (kadın)',               lv: 'A2' },
        { w: 'its',      tr: 'onun / onunki (cansız)',       lv: 'A2' },
        { w: 'itself',   tr: 'kendisi (cansız)',             lv: 'B1' },
        { w: 'they',     tr: 'onlar',                        lv: 'A1' },
        { w: 'them',     tr: 'onları / onlara',              lv: 'A1' },
        { w: 'their',    tr: 'onların',                      lv: 'A1' },
        { w: 'theirs',   tr: 'onlarınki',                    lv: 'A2' },
        { w: 'myself',   tr: 'kendim',                       lv: 'A2' },
        { w: 'yourself', tr: 'kendin',                       lv: 'A2' },
        { w: 'ourselves',tr: 'kendimiz',                     lv: 'B1' },
        { w: 'yourselves',tr:'kendiniz',                     lv: 'B1' }
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
        KELIMELER.push({ w: e.w, tr: e.tr, lv: e.lv, ct: 'zamirler', pr: '', ex: '', exTr: '' });
        eklenen++;
    });
    if (typeof window !== 'undefined') window.__ZAMIR_EKLENEN = eklenen;
})();
