// ==================================================
// EngLearn — Ek İsimler (fiil → isim)
// Tümü GERÇEK İngilizce sözcüklerdir; sözlüğe eklenir.
// Örn: celebrate→celebration (kutlama) — celebrity DEĞİL!
// ==================================================
(function () {
    var MAP = {
        'celebrate': [{ w: 'celebration',  tr: 'kutlama',      lv: 'B1' }],
        'decide':    [{ w: 'decision',     tr: 'karar',        lv: 'B1' }],
        'choose':    [{ w: 'choice',       tr: 'seçim',        lv: 'B1' }],
        'create':    [{ w: 'creation',     tr: 'yaratma',      lv: 'B2' }],
        'act':       [{ w: 'action',       tr: 'eylem',        lv: 'B1' }],
        'educate':   [{ w: 'education',    tr: 'eğitim',       lv: 'B1' }],
        'invite':    [{ w: 'invitation',   tr: 'davet',        lv: 'B1' }],
        'imagine':   [{ w: 'imagination',  tr: 'hayal gücü',   lv: 'B2' }],
        'inform':    [{ w: 'information',  tr: 'bilgi',        lv: 'A2' }],
        'suggest':   [{ w: 'suggestion',   tr: 'öneri',        lv: 'B1' }],
        'discuss':   [{ w: 'discussion',   tr: 'tartışma',     lv: 'B1' }],
        'explain':   [{ w: 'explanation',  tr: 'açıklama',     lv: 'A2' }],
        'argue':     [{ w: 'argument',     tr: 'tartışma',     lv: 'B1' }],
        'believe':   [{ w: 'belief',       tr: 'inanç',        lv: 'B1' }],
        'arrive':    [{ w: 'arrival',      tr: 'varış',        lv: 'B1' }],
        'depart':    [{ w: 'departure',    tr: 'kalkış',       lv: 'B2' }],
        'expand':    [{ w: 'expansion',    tr: 'genişleme',    lv: 'B2' }],
        'protect':   [{ w: 'protection',   tr: 'koruma',       lv: 'B1' }],
        'prevent':   [{ w: 'prevention',   tr: 'önleme',       lv: 'B2' }],
        'connect':   [{ w: 'connection',   tr: 'bağlantı',     lv: 'B1' }],
        'collect':   [{ w: 'collection',   tr: 'koleksiyon',   lv: 'B1' }],
        'select':    [{ w: 'selection',    tr: 'seçim',        lv: 'B2' }],
        'direct':    [{ w: 'direction',    tr: 'yön',          lv: 'A2' }],
    };
    if (typeof window !== 'undefined') window.__ISIM_MAP = MAP;
    if (typeof KELIMELER !== 'undefined') {
        var var_olan = {};
        for (var i = 0; i < KELIMELER.length; i++) {
            if (KELIMELER[i] && KELIMELER[i].w) var_olan[KELIMELER[i].w.toLowerCase()] = 1;
        }
        for (var k in MAP) {
            MAP[k].forEach(function (a) {
                var w = String(a.w);
                if (var_olan[w.toLowerCase()]) return;
                var_olan[w.toLowerCase()] = 1;
                KELIMELER.push({ w: w, tr: a.tr, lv: a.lv, ct: 'isimler', pr: '', ex: '', exTr: '' });
            });
        }
    }
})();
