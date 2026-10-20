// ==================================================
// EngLearn — Fiil Dağınıklık Temizleyici
// 1) Fiil kayıtlarında ÇEKİMLİ/EDİLGEN anlamları at
//    ("sonuçlandırıldı", "kutluyor", "yaptı", "gidecek")
// 2) Aynı kelimenin AYNI KÖK anlamlarını tek kayda birleştir
// ==================================================
(function () {
    if (typeof KELIMELER === 'undefined' || !KELIMELER.length) return;

    var norm = function (s) { return String(s || '').toLowerCase().trim(); };
    var trIlk = function (s) {
        return norm(s).replace(/\s*\/.*$/g, '').replace(/\s*\(.*?\)\s*$/g, '').trim();
    };

    // ---- 1) Çekimli/edilgen anlamları at ----
    var cekimli = /(?:[ıiuü])yor$|[dt][ıiuü]$|(?:ecek|acak)$|(?:mış|miş|muş|müş)$|(?:an|en)$/;
    var liste = [];
    for (var i = 0; i < KELIMELER.length; i++) {
        var k = KELIMELER[i];
        if (k && (k.ct || '').toLowerCase().indexOf('fiil') >= 0) {
            var t = trIlk(k.tr);
            if (cekimli.test(t)) continue;   // şimdiki / geçmiş / edilgen / gelecek → at
        }
        liste.push(k);
    }
    KELIMELER.length = 0;
    KELIMELER.push.apply(KELIMELER, liste);

    // ---- 2) Aynı kelime + aynı kök anlam → tek kayıt ----
    var kok = function (t) {
        t = trIlk(t);
        if (/mek$/.test(t)) t = t.slice(0, -3);
        else if (/mak$/.test(t)) t = t.slice(0, -3);
        return t;
    };
    var idx = {};
    var temiz = [];
    for (var j = 0; j < KELIMELER.length; j++) {
        var k2 = KELIMELER[j];
        var wl = String(k2.w || '').toLowerCase();
        var key = wl + '|' + kok(k2.tr);
        var sira = idx[key];
        if (sira === undefined) {
            idx[key] = temiz.length;
            temiz.push(k2);
        } else {
            var eski = temiz[sira];
            var eskiFiil = (eski.ct || '').toLowerCase().indexOf('fiil') >= 0;
            var buFiil = (k2.ct || '').toLowerCase().indexOf('fiil') >= 0;
            var buOrnek = !!(k2.ex);
            var eskiOrnek = !!(eski.ex);
            var degistir = false;
            if (buFiil && !eskiFiil) degistir = true;
            else if (buFiil === eskiFiil && buOrnek && !eskiOrnek) degistir = true;
            else if (!buFiil && eskiFiil) degistir = false;
            if (degistir) temiz[sira] = k2;
        }
    }
    KELIMELER.length = 0;
    KELIMELER.push.apply(KELIMELER, temiz);
})();
