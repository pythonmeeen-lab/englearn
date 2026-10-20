// ==================================================
// EngLearn — Ek Sıfatlar (noun → adjective)
// Değerleri GERÇEK İngilizce sıfatlardır; sözlüğe eklenir.
// Aynı kelime zaten sözlükteyse tekrar eklenmez.
// ==================================================
(function () {
    var MAP = {
        'beauty':     [{ w: 'beautiful',  tr: 'güzel',         lv: 'A2' }],
        'danger':     [{ w: 'dangerous',  tr: 'tehlikeli',     lv: 'A2' }],
        'interest':   [{ w: 'interesting',tr: 'ilginç',        lv: 'A2' }],
        'nature':     [{ w: 'natural',    tr: 'doğal',         lv: 'B1' }],
        'sun':        [{ w: 'sunny',      tr: 'güneşli',       lv: 'A2' }],
        'rain':       [{ w: 'rainy',      tr: 'yağmurlu',      lv: 'A2' }],
        'wind':       [{ w: 'windy',      tr: 'rüzgârlı',      lv: 'A2' }],
        'cloud':      [{ w: 'cloudy',     tr: 'bulutlu',       lv: 'A2' }],
        'fog':        [{ w: 'foggy',      tr: 'sisli',         lv: 'B1' }],
        'snow':       [{ w: 'snowy',      tr: 'karlı',         lv: 'B1' }],
        'storm':      [{ w: 'stormy',     tr: 'fırtınalı',     lv: 'B1' }],
        'care':       [{ w: 'careful',    tr: 'dikkatli',      lv: 'A2' }, { w: 'careless', tr: 'dikkatsiz', lv: 'B1' }],
        'help':       [{ w: 'helpful',    tr: 'yardımsever',   lv: 'B1' }, { w: 'helpless',  tr: 'çaresiz',  lv: 'B2' }],
        'pain':       [{ w: 'painful',    tr: 'acı verici',    lv: 'B1' }],
        'use':        [{ w: 'useful',     tr: 'faydalı',       lv: 'A2' }, { w: 'useless', tr: 'işe yaramaz', lv: 'B1' }],
        'hope':       [{ w: 'hopeful',    tr: 'umutlu',        lv: 'B1' }],
        'power':      [{ w: 'powerful',   tr: 'güçlü',         lv: 'B1' }, { w: 'powerless', tr: 'güçsüz', lv: 'B2' }],
        'success':    [{ w: 'successful', tr: 'başarılı',      lv: 'B1' }],
        'peace':      [{ w: 'peaceful',   tr: 'huzurlu',       lv: 'B1' }],
        'health':     [{ w: 'healthy',    tr: 'sağlıklı',      lv: 'A2' }],
        'wealth':     [{ w: 'wealthy',    tr: 'zengin',        lv: 'B2' }],
        'luck':       [{ w: 'lucky',      tr: 'şanslı',        lv: 'A2' }],
        'noise':      [{ w: 'noisy',      tr: 'gürültülü',     lv: 'A2' }],
        'sleep':      [{ w: 'sleepy',     tr: 'uykulu',        lv: 'A2' }],
        'salt':       [{ w: 'salty',      tr: 'tuzlu',         lv: 'B1' }],
        'sand':       [{ w: 'sandy',      tr: 'kumlu',         lv: 'B1' }],
        'rock':       [{ w: 'rocky',      tr: 'kayalık',       lv: 'B2' }],
        'smoke':      [{ w: 'smoky',      tr: 'dumanlı',       lv: 'B2' }],
        'ice':        [{ w: 'icy',        tr: 'buzlu',         lv: 'B1' }],
        'anger':      [{ w: 'angry',      tr: 'öfkeli',        lv: 'A2' }],
        'hunger':     [{ w: 'hungry',     tr: 'aç',            lv: 'A2' }],
        'thirst':     [{ w: 'thirsty',    tr: 'susamış',       lv: 'A2' }],
        'mess':       [{ w: 'messy',      tr: 'dağınık',       lv: 'B1' }],
        'fun':        [{ w: 'funny',      tr: 'komik',         lv: 'A2' }],
        'fame':       [{ w: 'famous',     tr: 'ünlü',          lv: 'A2' }],
        'act':        [{ w: 'active',     tr: 'aktif',         lv: 'B1' }],
        'create':     [{ w: 'creative',   tr: 'yaratıcı',      lv: 'B1' }],
        'attract':    [{ w: 'attractive', tr: 'çekici',        lv: 'B1' }],
        'expense':    [{ w: 'expensive',  tr: 'pahalı',        lv: 'A2' }],
        'nation':     [{ w: 'national',   tr: 'ulusal',        lv: 'B1' }],
        'tradition':  [{ w: 'traditional',tr: 'geleneksel',    lv: 'B1' }],
        'culture':    [{ w: 'cultural',   tr: 'kültürel',      lv: 'B1' }],
        'person':     [{ w: 'personal',   tr: 'kişisel',       lv: 'B1' }],
        'friend':     [{ w: 'friendly',   tr: 'arkadaş canlısı',lv: 'A2' }],
        'day':        [{ w: 'daily',      tr: 'günlük',        lv: 'B1' }],
        'mountain':   [{ w: 'mountainous',tr: 'dağlık',        lv: 'B2' }],
        'economy':    [{ w: 'economic',   tr: 'ekonomik',      lv: 'B1' }],
        'history':    [{ w: 'historical', tr: 'tarihî',        lv: 'B2' }],
        'science':    [{ w: 'scientific', tr: 'bilimsel',      lv: 'B2' }],
        'artist':     [{ w: 'artistic',   tr: 'sanatsal',      lv: 'B2' }],
        'hero':       [{ w: 'heroic',     tr: 'kahramanca',    lv: 'B2' }],
        'courage':    [{ w: 'courageous', tr: 'cesur',         lv: 'B2' }],
        'patience':   [{ w: 'patient',    tr: 'sabırlı',       lv: 'B1' }],
        'silence':    [{ w: 'silent',     tr: 'sessiz',        lv: 'A2' }],
        'confidence': [{ w: 'confident',  tr: 'kendine güvenen',lv: 'B1' }],
        'difference': [{ w: 'different',  tr: 'farklı',        lv: 'A2' }],
        'importance': [{ w: 'important',  tr: 'önemli',        lv: 'A2' }],
        'freedom':    [{ w: 'free',       tr: 'özgür',         lv: 'B1' }],
        'truth':      [{ w: 'true',       tr: 'doğru',         lv: 'A2' }],
        'strength':   [{ w: 'strong',     tr: 'güçlü',         lv: 'A2' }],
    };
    if (typeof window !== 'undefined') window.__SIFAT_MAP = MAP;
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
                KELIMELER.push({ w: w, tr: a.tr, lv: a.lv, ct: 'sıfatlar', pr: '', ex: '', exTr: '' });
            });
        }
    }
})();
