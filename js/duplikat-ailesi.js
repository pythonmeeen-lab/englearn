// ==================================================
// EngLearn — Kelime Ailesi Birleştirme
// traveling/traveled/travels gibi çekim/türeme formlarını,
// anlamları ilişkiliyse kökle birleştirir.
// ==================================================
(function () {
    if (typeof KELIMELER === 'undefined' || !KELIMELER.length) return;
    var norm = function (s) { return String(s || '').toLowerCase().trim(); };
    var trTemiz = function (s) {
        return norm(s).replace(/\s*\/.*$/g, '').replace(/\s*\(.*?\)\s*$/g, '').replace(/\s*[-–].*$/g, '').trim();
    };
    var iliskili = function (a, b) {
        if (!a || !b) return false;
        if (a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return true;
        var ta = a.split(' ')[0], tb = b.split(' ')[0];
        if (ta && ta === tb) return true;
        if (ta.length > 3 && tb.length > 3 && (ta.indexOf(tb) === 0 || tb.indexOf(ta) === 0)) return true;
        return false;
    };
    // Zamirler korunur (hers/its/itself gibi türev sayılıp silinmesin)
    var ZAMIR = new Set(('i me my mine myself you your yours yourself he him his himself ' +
        'she her hers herself it its itself we us our ours ourselves they them their theirs themselves').split(' '));

    function kokAdaylar(w) {
        var a = [];
        if (/ies$/.test(w)) a.push(w.slice(0, -3) + 'y');
        if (/(ss|sh|ch|x|z)es$/.test(w)) a.push(w.slice(0, -2));
        if (/[^s]s$/.test(w)) a.push(w.slice(0, -1));
        if (/([^e])ed$/.test(w)) a.push(w.slice(0, -2));
        if (/[^e]d$/.test(w)) a.push(w.slice(0, -1));
        if (/[^n]ing$/.test(w)) a.push(w.slice(0, -3));
        // NOT: -er/-ers (owner, teacher, worker gibi meslek/kişi isimleri) KORUNUR;
        var extra = [];
        for (var i = 0; i < a.length; i++) {
            var k = a[i];
            if (k.length > 2 && k.charAt(k.length - 1) === k.charAt(k.length - 2)) extra.push(k.slice(0, -1));
        }
        var tek = w.replace(/(.)\1/g, '$1');
        if (tek !== w) extra.push(tek);
        return a.concat(extra);
    }
    var entries = [];
    for (var i = 0; i < KELIMELER.length; i++) {
        var k = KELIMELER[i];
        if (k && k.w) entries.push({ k: k, w: norm(k.w), tr: trTemiz(k.tr) });
    }
    var kelimeSet = new Set(entries.map(function (e) { return e.w; }));
    var ilkTr = {};
    entries.forEach(function (e) { if (!(e.w in ilkTr)) ilkTr[e.w] = e.tr; });
    var silinecek = new Set();
    var gorulen = {};
    entries.forEach(function (e, idx) {
        var liste = gorulen[e.w] || (gorulen[e.w] = []);
        var cakisan = false;
        for (var j = 0; j < liste.length; j++) { if (iliskili(liste[j], e.tr)) { cakisan = true; break; } }
        if (cakisan && !ZAMIR.has(e.w)) silinecek.add(idx); else liste.push(e.tr);
    });
    entries.forEach(function (e, idx) {
        if (silinecek.has(idx)) return;
        if (ZAMIR.has(e.w)) return;
        var kokler = kokAdaylar(e.w);
        for (var j = 0; j < kokler.length; j++) {
            var b = kokler[j];
            if (b && b !== e.w && kelimeSet.has(b) && iliskili(e.tr, ilkTr[b])) { silinecek.add(idx); break; }
        }
    });
    var kalan = [];
    entries.forEach(function (e, idx) { if (!silinecek.has(idx)) kalan.push(e.k); });
    KELIMELER.length = 0;
    KELIMELER.push.apply(KELIMELER, kalan);
})();
