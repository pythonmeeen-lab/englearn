// ==================================================
// EngLearn — Cümle Oluşturma Verileri
// National Geographic Temalı (B1-C1 seviye)
// her cümle: { tr: "Türkçe", en: "İngilizce", zorluk: 1-3 }
// ==================================================
const CUMLER = [
    // ---- B1 Seviye ----
    { tr: "Safari'de birçok vahşi hayvan gördük.", en: "We saw many wild animals on the safari.", zorluk: 1 },
    { tr: "Yağmur ormanı birçok nadir türe ev sahipliği yapıyor.", en: "The rainforest is home to many rare species.", zorluk: 2 },
    { tr: "Kuşlar kışın güneye göç eder.", en: "Birds migrate south in the winter.", zorluk: 1 },
    { tr: "Ormansızlaşma hayvanların yaşam alanını yok ediyor.", en: "Deforestation destroys the animals' habitat.", zorluk: 2 },
    { tr: "Kâşifler kuzey kutbunu keşfetmeye çalıştı.", en: "The explorers tried to reach the North Pole.", zorluk: 2 },
    { tr: "Mercan resifi rengarenk balıklarla dolu.", en: "The coral reef is full of colourful fish.", zorluk: 2 },
    { tr: "Her ülkenin kendine özgü bir kültürü vardır.", en: "Every country has its own culture.", zorluk: 1 },
    { tr: "Küresel ısınma yüzünden buzullar eriyor.", en: "Glaciers are melting because of global warming.", zorluk: 2 },
    { tr: "Urduklar sabahın erken saatlerinde avlanır.", en: "Predators hunt during the early morning.", zorluk: 2 },
    { tr: "Yerel halk nehri korumak için çalışıyor.", en: "The community works to protect the river.", zorluk: 2 },

    // ---- B2 Seviye ----
    { tr: "Bilim insanları okyanusta yeni bir tür keşfetti.", en: "Scientists discovered a new species in the ocean.", zorluk: 2 },
    { tr: "Mercan resifleri hassas ekosistemlerdir.", en: "Coral reefs are fragile ecosystems.", zorluk: 2 },
    { tr: "Göçebe kabileler mevsimlere göre hareket eder.", en: "Nomadic tribes move with the changing seasons.", zorluk: 2 },
    { tr: "Biyolojik çeşitliliği korumak gezegenimiz için şarttır.", en: "Protecting biodiversity is essential for our planet.", zorluk: 3 },
    { tr: "Yanardağ geçen yüzyıl büyük bir kanyon oluşturdu.", en: "The volcano created a huge canyon last century.", zorluk: 3 },
    { tr: "Ormanlar nefes almamız için oksijen üretir.", en: "Forests produce oxygen for us to breathe.", zorluk: 2 },
    { tr: "Fosil yakıtları yakmak kirliliği artırıyor.", en: "Burning fossil fuels increases pollution.", zorluk: 2 },
    { tr: "Kabile üyeleri eski geleneklerini koruyor.", en: "The tribe members preserve their old traditions.", zorluk: 2 },
    { tr: "Okyanusun derinlikleri büyüleyici bir dünyadır.", en: "The depths of the ocean are a fascinating world.", zorluk: 3 },
    { tr: "İlk denizciler yıldızlara bakarak yön buldu.", en: "Early sailors navigated by the stars.", zorluk: 2 },

    // ---- C1 Seviye ----
    { tr: "İnsan kaynaklı kirlilik iklimimizi değiştiriyor.", en: "Anthropogenic pollution is changing our climate.", zorluk: 3 },
    { tr: "Mercan resifleri değişime karşı büyük direnç gösterir.", en: "Coral reefs show great resilience to change.", zorluk: 3 },
    { tr: "Eko-turizm yerel topluluklara faydalar sağlar.", en: "Ecotourism brings benefits to local communities.", zorluk: 3 },
    { tr: "Kültürel miras bir milletin kimliğini şekillendirir.", en: "Cultural heritage shapes a nation's identity.", zorluk: 3 },
    { tr: "Yerli halklar geniş bölgeleri geleneksel olarak korur.", en: "Indigenous people traditionally protect vast territories.", zorluk: 3 },
    { tr: "Kuzey ışıkları doğal bir fenomendir.", en: "The northern lights are a natural phenomenon.", zorluk: 2 },
    { tr: "Arkeolojik alanlar dikkatle korunmalıdır.", en: "Archaeological sites must be carefully preserved.", zorluk: 3 },
    { tr: "Sürdürülebilir turizm doğa harikalarını korur.", en: "Sustainable tourism protects natural wonders.", zorluk: 3 }
];