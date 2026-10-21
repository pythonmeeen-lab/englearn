// ==================================================
// EngLearn — Tekrar eden kelimeleri temizler
// (aynı yazı + aynı anlam) + güvenli çoğul fazlalıkları.
// data dosyalarından SONRA, app.js'ten ÖNCE yüklenir.
// ==================================================
(function () {
    if (typeof KELIMELER === 'undefined' || !KELIMELER.length) return;

    var norm = function (s) { return String(s || '').toLowerCase().trim(); };
    var trTemiz = function (s) {
        return norm(s)
            .replace(/\s*\/.*$/g, '')            // "x / y" -> "x"
            .replace(/\s*\(.*?\)\s*$/g, '')      // "x (genel)" -> "x"
            .replace(/\s*[-–]\s*.*$/g, '')       // "x - y" -> "x"
            .trim();
    };

    // 1) Aynı yazı + aynı anlam -> ilki kalsın
    var goruldu = new Set();
    var temiz = [];
    for (var i = 0; i < KELIMELER.length; i++) {
        var k = KELIMELER[i];
        if (!k || !k.w) continue;
        var anahtar = norm(k.w) + '|' + trTemiz(k.tr);
        if (!goruldu.has(anahtar)) { goruldu.add(anahtar); temiz.push(k); }
    }
    KELIMELER.length = 0;
    KELIMELER.push.apply(KELIMELER, temiz);

    // 2) Cogul temizligi: koku AYNI ANLAMDA zaten varsa cogulu kaldir
    var anlamlar = {};   // koku -> Set(anlam)
    for (var j = 0; j < KELIMELER.length; j++) {
        var w = norm(KELIMELER[j].w);
        if (!anlamlar[w]) anlamlar[w] = new Set();
        anlamlar[w].add(trTemiz(KELIMELER[j].tr));
    }
    var cogulMu = function (taban) {
        if (/[^aeiou]y$/.test(taban)) return taban.slice(0, -1) + 'ies';
        if (/(s|ss|sh|ch|x|z)$/.test(taban)) return taban + 'es';
        return taban + 's';
    };
    function kokAday(w) {
        if (w.length <= 3) return null;
        if (/[^aeiou]ies$/.test(w)) return w.slice(0, -3) + 'y';
        if (/es$/.test(w)) return w.slice(0, -2);
        if (/[^s]s$/.test(w)) return w.slice(0, -1);
        return null;
    }
    var degerlendirildi = new Set();
    var son = KELIMELER.filter(function (k) {
        var w = norm(k.w);
        if (degerlendirildi.has(w)) return true;
        degerlendirildi.add(w);
        var kok = kokAday(w);
        if (!kok || !anlamlar[kok]) return true;
        if (cogulMu(kok) !== w) return true;             // standart cogul degil
        var a = trTemiz(k.tr);
        if (anlamlar[kok].has(a) && anlamlar[w].has(a)) return false; // ayni anlam -> kudur
        return true;
    });
    KELIMELER.length = 0;
    KELIMELER.push.apply(KELIMELER, son);

    // 4) FİİL kategorisinde aynı kelimeden TEK kayıt kalsın
    //    (çekim/çeviri artıklarından oluşan "conclude x4" gibi tekrarlar)
    var fiilGor = new Set();
    var fiilTemiz = [];
    for (var fi = 0; fi < KELIMELER.length; fi++) {
        var fk = KELIMELER[fi];
        if (!fk || !fk.w) continue;
        var fct = (fk.ct || '').toLowerCase();
        var fiilMi = fct.indexOf('fiil') >= 0 || fct === 'phrasal';
        if (fiilMi) {
            var fkey = norm(fk.w);
            if (fiilGor.has(fkey)) continue;   // aynı fiil zaten var → atla
            fiilGor.add(fkey);
        }
        fiilTemiz.push(fk);
    }
    KELIMELER.length = 0;
    KELIMELER.push.apply(KELIMELER, fiilTemiz);
})();
