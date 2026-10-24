// ==================================================
// EngLearn — Ekstra Sözlük Kelimeleri
// Sözlükte zaten olan kelime atlanır.
// ==================================================
(function () {
    var LISTE = [
        { w: 'investigation', tr: 'araştırma / soruşturma / inceleme', lv: 'B1', ct: 'isimler' },
        { w: 'ongoing', tr: 'devam eden / süren / süregelen', lv: 'B2', ct: 'sıfatlar' },
        { w: 'retirement', tr: 'emeklilik / emeklilik dönemi', lv: 'B1', ct: 'isimler' },
        { w: 'sense of', tr: '…duygusu / …hissi (ör. sense of humor = mizah duygusu)', lv: 'B1', ct: 'ifadeler' },
        { w: 'sense of humor', tr: 'mizah duygusu', lv: 'B1', ct: 'ifadeler' },
        { w: 'several', tr: 'birkaç / birçok / çeşitli', lv: 'A2', ct: 'sıfatlar' },
        { w: 'hurricane', tr: 'kasırga / fırtına', lv: 'B1', ct: 'doğa' },
        { w: 'build on', tr: 'üzerine inşa etmek / temel alıp geliştirmek', lv: 'B2', ct: 'PHRASAL' },
        { w: 'memorable', tr: 'unutulmaz / akılda kalan / hatırlanmaya değer', lv: 'B1', ct: 'sıfatlar' },
        { w: 'drench', tr: 'sırılsıklam etmek / ıslatmak / (şurup vb.) bolca dökmek', lv: 'B2', ct: 'fiiller' }
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
