// ==================================================
// EngLearn — Orta Seviye Kelimeler (A2)
// Not: A1 kelimeleri kaldırıldı. Bu dosya A2 seviye
// temel kelimeleri içerir.
// ==================================================
const KELIMELER = [
    // ---- Şehir & Yerler (A2) ----
    { w: "library", tr: "kütüphane", lv: "A2", ct: "şehir", pr: "/ˈlaɪ.brər.i/", ex: "She studies at the library every evening.", exTr: "Her akşam kütüphanede ders çalışır." },
    { w: "market", tr: "pazar / market", lv: "A2", ct: "şehir", pr: "/ˈmɑː.kɪt/", ex: "We buy fresh vegetables at the market.", exTr: "Taze sebzeleri pazardan alıyoruz." },
    { w: "restaurant", tr: "restoran", lv: "A2", ct: "şehir", pr: "/ˈres.trɒnt/", ex: "This restaurant is famous for its seafood.", exTr: "Bu restoran deniz ürünleriyle ünlüdür." },
    { w: "neighbourhood", tr: "mahalle / çevre", lv: "A2", ct: "şehir", pr: "/ˈneɪ.bə.hʊd/", ex: "Our neighbourhood has a lovely park.", exTr: "Mahallemizde güzel bir park var." },
    { w: "bridge", tr: "köprü", lv: "A2", ct: "şehir", pr: "/brɪdʒ/", ex: "The old bridge crosses the river.", exTr: "Eski köprü nehrin üzerinden geçiyor." },

    // ---- Seyahat (A2) ----
    { w: "airport", tr: "havaalanı", lv: "A2", ct: "şehir", pr: "/ˈeə.pɔːt/", ex: "We arrived at the airport two hours early.", exTr: "Havaalanına iki saat erken vardık." },
    { w: "journey", tr: "yolculuk", lv: "A2", ct: "seyahat", pr: "/ˈdʒɜː.ni/", ex: "The journey by train took six hours.", exTr: "Tren yolculuğu altı saat sürdü." },
    { w: "abroad", tr: "yurt dışında", lv: "A2", ct: "seyahat", pr: "/əˈbrɔːd/", ex: "She wants to study abroad next year.", exTr: "Gelecek yıl yurt dışında okumak istiyor." },
    { w: "luggage", tr: "bagaj", lv: "A2", ct: "seyahat", pr: "/ˈlʌɡ.ɪdʒ/", ex: "Please keep your luggage with you.", exTr: "Lütfen bagajınızı yanınızda tutun." },
    { w: "guide", tr: "rehber", lv: "A2", ct: "seyahat", pr: "/ɡaɪd/", ex: "The guide showed us around the city.", exTr: "Rehber bize şehri gezdirdi." },

    // ---- Hava & Doğa (A2) ----
    { w: "nature", tr: "doğa", lv: "A2", ct: "çevre", pr: "/ˈneɪ.tʃər/", ex: "We spent the weekend close to nature.", exTr: "Hafta sonunu doğanın içinde geçirdik." },
    { w: "forest", tr: "orman", lv: "A2", ct: "çevre", pr: "/ˈfɒr.ɪst/", ex: "The forest is home to many animals.", exTr: "Orman birçok hayvana ev sahipliği yapar." },
    { w: "river", tr: "nehir", lv: "A2", ct: "çevre", pr: "/ˈrɪv.ər/", ex: "The river flows into the sea.", exTr: "Nehir denize dökülüyor." },
    { w: "island", tr: "ada", lv: "A2", ct: "çevre", pr: "/ˈaɪ.lənd/", ex: "They sailed to a small island.", exTr: "Küçük bir adaya yelken açtılar." },
    { w: "coast", tr: "kıyı / sahil", lv: "A2", ct: "çevre", pr: "/kəʊst/", ex: "The hotel is on the south coast.", exTr: "Otel güney kıyısında." },

    // ---- Sağlık & Beden (A2) ----
    { w: "health", tr: "sağlık", lv: "A2", ct: "sağlık", pr: "/helθ/", ex: "Health is more important than wealth.", exTr: "Sağlık zenginlikten daha önemlidir." },
    { w: "healthy", tr: "sağlıklı", lv: "A2", ct: "sağlık", pr: "/ˈhel.θi/", ex: "A balanced diet keeps you healthy.", exTr: "Dengeli beslenme seni sağlıklı tutar." },
    { w: "medicine", tr: "ilaç / tıp", lv: "A2", ct: "sağlık", pr: "/ˈmed.ɪ.sən/", ex: "He takes medicine after every meal.", exTr: "Her yemekten sonra ilaç alıyor." },
    { w: "exercise", tr: "egzersiz", lv: "A2", ct: "sağlık", pr: "/ˈek.sə.saɪz/", ex: "Daily exercise improves your mood.", exTr: "Günlük egzersiz ruh halini iyileştirir." },
    { w: "tired", tr: "yorgun", lv: "A2", ct: "sıfatlar", pr: "/taɪəd/", ex: "I feel tired after the long trip.", exTr: "Uzun yolculuktan sonra yorgun hissediyorum." },

    // ---- Kişilik & Duygular (A2) ----
    { w: "kind", tr: "nazik", lv: "A2", ct: "duygular", pr: "/kaɪnd/", ex: "It was kind of you to help me.", exTr: "Bana yardım etmen çok nazikti." },
    { w: "excited", tr: "heyecanlı", lv: "A2", ct: "duygular", pr: "/ɪkˈsaɪ.tɪd/", ex: "We are excited about the wildlife tour.", exTr: "Yaban hayatı turu için heyecanlıyız." },
    { w: "surprised", tr: "şaşırmış", lv: "A2", ct: "duygular", pr: "/səˈpraɪzd/", ex: "She was surprised by the beautiful view.", exTr: "Güzel manzaraya şaşırdı." },
    { w: "worried", tr: "endişeli", lv: "A2", ct: "duygular", pr: "/ˈwʌr.id/", ex: "Don't be worried about the weather.", exTr: "Hava durumu için endişelenme." },
    { w: "brave", tr: "cesur", lv: "A2", ct: "duygular", pr: "/breɪv/", ex: "The explorers were brave and careful.", exTr: "Kâşifler cesur ve dikkatliydi." },

    // ---- Eğitim & İş (A2) ----
    { w: "university", tr: "üniversite", lv: "A2", ct: "eğitim", pr: "/ˌjuː.nɪˈvɜː.sə.ti/", ex: "She studies biology at the university.", exTr: "Üniversitede biyoloji okuyor." },
    { w: "subject", tr: "ders / konu", lv: "A2", ct: "eğitim", pr: "/ˈsʌb.dʒekt/", ex: "Geography is my favourite subject.", exTr: "Coğrafya en sevdiğim derstir." },
    { w: "exam", tr: "sınav", lv: "A2", ct: "eğitim", pr: "/ɪɡˈzæm/", ex: "I have my final exam next week.", exTr: "Gelecek hafta final sınavım var." },
    { w: "company", tr: "şirket", lv: "A2", ct: "iş", pr: "/ˈkʌm.pə.ni/", ex: "He works for an international company.", exTr: "Uluslararası bir şirkette çalışıyor." },
    { w: "meeting", tr: "toplantı", lv: "A2", ct: "iş", pr: "/ˈmiː.tɪŋ/", ex: "The meeting starts at ten o'clock.", exTr: "Toplantı saat onda başlıyor." }
];